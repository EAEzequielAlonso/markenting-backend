import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateFamilyDto } from './dto/create-family.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { Family } from './entities/family.entity';
import { FamilyMember } from './entities/family-member.entity';
import { Church } from '../churches/entities/church.entity';
import { MembersService } from '../members/members.service';
import { MembershipStatus, SystemRole } from '../common/enums';

@Injectable()
export class FamiliesService {
    constructor(
        @InjectRepository(Family)
        private familyRepository: Repository<Family>,
        @InjectRepository(FamilyMember)
        private familyMemberRepository: Repository<FamilyMember>,
        private membersService: MembersService,
        private dataSource: DataSource,
    ) { }

    async create(createFamilyDto: CreateFamilyDto, churchId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Create Family
            const family = this.familyRepository.create({
                name: createFamilyDto.name,
                church: { id: churchId }
            });
            const savedFamily = await queryRunner.manager.save(family);

            // 2. Process Members
            for (const memberDto of createFamilyDto.members) {
                let memberId = memberDto.memberId;

                // Creating new member if needed (e.g. Children)
                if (!memberId && memberDto.newMember) {
                    // Force status to CHILD if role is CHILD? Or let the DTO decide?
                    // The prompt said "los hijos debe estar linkeados... quizas crearle algun nuevo perfil... CHILD"
                    // If creating a child, we likely want to set status=CHILD by default if not set.
                    if (memberDto.role === 'CHILD' && !memberDto.newMember.status) {
                        memberDto.newMember.status = MembershipStatus.CHILD;
                    }

                    // We use MembersService for creation. 
                    // Since MembersService uses its own repository, we might want to use it directly
                    // but we are in a transaction. Ideally MembersService should accept a manager or we do it manually here.
                    // For simplicity and avoiding massive refactor of MembersService to accept Transactional Manager,
                    // we will await the creation. If fails, we rollback.
                    // Risk: MembersService.create is NOT part of this transaction manager.
                    // Workaround: Use MembersService but if family fails, we might have orphan members.
                    // Better: Re-implement basic member unique creation here using queryRunner OR
                    // just accept that member creation is separate.
                    // Given the request "funcional y sin errores", let's try to do it properly. 
                    // But MembersService logic is complex (Person deduplication). 
                    // Let's call MembersService.create. If it fails, the global transaction rolls back Family, 
                    // but created members might persist if MembersService saves them immediately.

                    // Actually, MembersService.create does `this.memberRepository.save`.
                    // For now, let's assume it's fine. If Family creation fails, we might have a Child member created without a family.
                    // Cleanest quick way: Call membersService.create passing the transaction manager.
                    const newMember = await this.membersService.create(memberDto.newMember, churchId, queryRunner.manager);
                    memberId = newMember.id;
                }

                if (!memberId) {
                    continue; // Skip if no ID and no new member data
                }

                // Link to Family
                const familyMember = this.familyMemberRepository.create({
                    family: savedFamily,
                    member: { id: memberId },
                    role: memberDto.role
                });
                await queryRunner.manager.save(familyMember);
            }

            await queryRunner.commitTransaction();

            return this.findOne(savedFamily.id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(churchId: string) {
        return this.familyRepository.find({
            where: { church: { id: churchId } },
            relations: ['members', 'members.member', 'members.member.person']
        });
    }

    async findOne(id: number | string) {
        // id is string uuid
        return this.familyRepository.findOne({
            where: { id: id as string },
            relations: ['members', 'members.member', 'members.member.person']
        });
    }

    async update(id: string, updateFamilyDto: UpdateFamilyDto) {
        const family = await this.findOne(id);
        if (!family) throw new NotFoundException('Family not found');

        Object.assign(family, updateFamilyDto);
        return this.familyRepository.save(family);
    }

    async remove(id: string) {
        const family = await this.findOne(id);
        if (!family) throw new NotFoundException('Family not found');
        return this.familyRepository.remove(family);
    }

    async addMember(familyId: string, memberId: string, role: string) {
        const family = await this.findOne(familyId);
        if (!family) throw new NotFoundException('Family not found');

        // Check if already in family
        const existing = await this.familyMemberRepository.findOne({
            where: { family: { id: familyId }, member: { id: memberId } }
        });

        if (existing) {
            existing.role = role as any;
            return this.familyMemberRepository.save(existing);
        }

        const familyMember = this.familyMemberRepository.create({
            family,
            member: { id: memberId },
            role: role as any
        });

        return this.familyMemberRepository.save(familyMember);
    }

    async removeMember(familyId: string, memberId: string) {
        const fm = await this.familyMemberRepository.findOne({
            where: { family: { id: familyId }, member: { id: memberId } }
        });
        if (!fm) throw new NotFoundException('Member not found in family');
        return this.familyMemberRepository.remove(fm);
    }

    async findByMember(memberId: string) {
        const membership = await this.familyMemberRepository.findOne({
            where: { member: { id: memberId } },
            relations: ['family']
        });

        if (!membership) return null;

        return this.findOne(membership.family.id);
    }
}
