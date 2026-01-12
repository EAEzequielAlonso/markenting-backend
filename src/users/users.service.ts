import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Company } from '../companies/entities/company.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(Company)
        private companiesRepository: Repository<Company>,
        private subscriptionsService: SubscriptionsService,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const { email, password, fullName, companyName, avatarUrl } = createUserDto;

        // 1. Crear Company
        const company = this.companiesRepository.create({
            name: companyName,
            credits: 2000,
            plan: 'TRIAL',
        });

        try {
            await this.companiesRepository.save(company);
            // 1b. Crear Suscripción Trial
            await this.subscriptionsService.createTrial(company.id);
        } catch (error) {
            console.error('Error in user creation:', error);
            // Re-throw the original error if it's already an HTTP exception (unlikely here but good practice)
            // or throw a new one with the detail.
            throw new InternalServerErrorException(`Error creating company and trial subscription: ${error.message || error}`);
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Crear User
        const user = this.usersRepository.create({
            email,
            password: hashedPassword,
            fullName,
            role: UserRole.OWNER,
            company: company,
            avatarUrl,
        });

        try {
            await this.usersRepository.save(user);
        } catch (error) {
            if (error.code === '23505') { // Postgres unique_violation
                throw new ConflictException('Email already exists');
            }
            throw new InternalServerErrorException();
        }

        // TODO: Send Welcome Email

        return this.findOneByEmail(user.email);
    }

    async findOneByEmail(email: string): Promise<User | undefined> {
        return this.usersRepository.findOne({
            where: { email },
            relations: ['company'],
            select: ['id', 'email', 'password', 'role', 'fullName', 'company', 'googleId', 'avatarUrl'],
        });
    }

    async updateAvatar(id: string, avatarUrl: string): Promise<void> {
        await this.usersRepository.update(id, { avatarUrl });
    }
}
