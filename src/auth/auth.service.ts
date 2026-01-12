import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Church } from '../entities/church.entity';
import { ChurchMember } from '../entities/church-member.entity';
import { RegisterChurchDto, JoinChurchDto, LoginDto } from './dto';
import { ChurchRole, MemberStatus, PlanType, SubscriptionStatus } from '../entities/enums';
import { JwtPayload } from './interfaces';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Church) private churchRepository: Repository<Church>,
        @InjectRepository(ChurchMember) private memberRepository: Repository<ChurchMember>,
        private jwtService: JwtService,
    ) { }

    async registerChurch(dto: RegisterChurchDto) {
        // 1. Check if email exists
        const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        // 2. Check if church slug exists (if provided)
        if (dto.churchSlug) {
            const existingSlug = await this.churchRepository.findOne({ where: { slug: dto.churchSlug } });
            if (existingSlug) {
                throw new BadRequestException('Church slug is taken');
            }
        }

        // 3. Create Church
        const church = this.churchRepository.create({
            name: dto.churchName,
            slug: dto.churchSlug || this.generateSlug(dto.churchName),
            plan: PlanType.FREE,
            subscriptionStatus: SubscriptionStatus.TRIAL,
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        });
        const savedChurch = await this.churchRepository.save(church);

        // 4. Create User
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = this.userRepository.create({
            email: dto.email,
            password: hashedPassword,
            fullName: dto.fullName,
            isPlatformAdmin: false, // Default
        });
        const savedUser = await this.userRepository.save(user);

        // 5. Create ChurchMember (Admin)
        const member = this.memberRepository.create({
            user: savedUser,
            church: savedChurch,
            roles: [ChurchRole.ADMIN],
            status: MemberStatus.ACTIVE,
        });
        await this.memberRepository.save(member);

        // 6. Generate Token
        return this.login({ email: dto.email, password: dto.password, churchSlug: savedChurch.slug });
    }

    async joinChurch(dto: JoinChurchDto) {
        // 1. Find Church
        const church = await this.churchRepository.findOne({ where: { slug: dto.churchSlug } });
        if (!church) throw new BadRequestException('Church not found');

        // 2. Find or Create User
        let user = await this.userRepository.findOne({ where: { email: dto.email } });
        if (!user) {
            if (!dto.password) throw new BadRequestException('Password required for new user');
            const hashedPassword = await bcrypt.hash(dto.password, 10);
            user = this.userRepository.create({
                email: dto.email,
                password: hashedPassword,
                fullName: dto.fullName || 'New Member',
            });
            user = await this.userRepository.save(user);
        }

        // 3. Check existing membership
        const existingMember = await this.memberRepository.findOne({
            where: { user: { id: user.id }, church: { id: church.id } },
        });

        if (existingMember) {
            throw new BadRequestException('Already a member or pending approval');
        }

        // 4. Create Pending Membership
        const member = this.memberRepository.create({
            user,
            church,
            roles: [ChurchRole.MEMBER],
            status: MemberStatus.PENDING,
        });
        await this.memberRepository.save(member);

        return { message: 'Request sent. Waiting for approval.' };
    }

    async login(dto: LoginDto) {
        const user = await this.userRepository.findOne({
            where: { email: dto.email },
            select: ['id', 'email', 'password', 'fullName', 'isPlatformAdmin']
        });

        if (!user || !(await bcrypt.compare(dto.password, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        let churchId = null;
        let roles = [];

        // If churchSlug provided, validate membership
        if (dto.churchSlug) {
            const church = await this.churchRepository.findOne({ where: { slug: dto.churchSlug } });
            if (!church) throw new BadRequestException('Church not found');

            const membership = await this.memberRepository.findOne({
                where: { user: { id: user.id }, church: { id: church.id }, status: MemberStatus.ACTIVE },
            });

            if (!membership) {
                throw new UnauthorizedException('Not a member of this church or pending approval');
            }

            churchId = church.id;
            roles = membership.roles;
        } else {
            // Try to find a default church (first active membership)
            const membership = await this.memberRepository.findOne({
                where: { user: { id: user.id }, status: MemberStatus.ACTIVE },
                relations: ['church'],
                order: { joinedAt: 'DESC' }
            });
            if (membership) {
                churchId = membership.church.id;
                roles = membership.roles;
            }
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            churchId,
            roles
        };

        return {
            accessToken: this.jwtService.sign(payload),
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
            },
            churchId // Return to client so they know which context is active
        };
    }

    private generateSlug(name: string): string {
        return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 1000);
    }
}
