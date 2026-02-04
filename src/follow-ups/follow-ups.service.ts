import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { FollowUpPerson } from './entities/follow-up-person.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { FollowUpStatus } from '../common/enums';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { getPermissionsForRoles } from '../auth/authorization/role-permissions.config';

import { MembersService } from '../members/members.service'; // Import first

@Injectable()
export class FollowUpsService {
    constructor(
        @InjectRepository(FollowUpPerson) private personRepo: Repository<FollowUpPerson>,
        @InjectRepository(ChurchMember) private memberRepo: Repository<ChurchMember>,
        private membersService: MembersService
    ) { }

    async create(churchId: string, creatorMemberId: string, data: { firstName: string, lastName: string, phone?: string, email?: string, firstVisitDate?: Date }) {
        const person = this.personRepo.create({
            church: { id: churchId },
            ...data,
            createdByMemberId: creatorMemberId,
            status: FollowUpStatus.VISITOR
        });
        return this.personRepo.save(person);
    }

    async findAll(churchId: string, viewerMemberId: string, viewerRoles: string[], statusFilter?: string) {
        const permissions = getPermissionsForRoles(viewerRoles);
        // We can define a specific permission 'FOLLOW_UP_VIEW_ALL' or reuse an existing moderate role checks.
        // Usually Pastors/Admins/Deacons can view all.
        // Let's assume user with 'MEMBERS_VIEW' or similar high level permission.
        // Or specific 'FOLLOW_UPS_MANAGE'.

        // For simplicity provided in requirements: 
        // Pastor/Admin/Diacono: View All
        // Member: View Assigned only

        const canViewAll = permissions.includes(AppPermission.MEMBER_VIEW) || viewerRoles.includes('PASTOR') || viewerRoles.includes('ADMIN_APP') || viewerRoles.includes('DEACON') || viewerRoles.includes('ADMIN_CHURCH');
        // Note: MEMBERS_VIEW is a proxy. Ideally we have specific perm.

        const query = this.personRepo.createQueryBuilder('fp')
            .leftJoinAndSelect('fp.assignedMember', 'am')
            .leftJoinAndSelect('am.person', 'amp')
            .where('fp.churchId = :churchId', { churchId })
            .orderBy('fp.createdAt', 'DESC');

        if (statusFilter) {
            const statuses = statusFilter.split(',').map(s => s.trim());
            if (statuses.length > 0) {
                query.andWhere('fp.status IN (:...statuses)', { statuses });
            }
        } else {
            // Default: Hide HIDDEN unless specifically asked? 
            // Or if user is Admin, maybe show all ACTIVE/FINISHED by default?
            // User requirement: "Filtros por estado".
            // If no filter, maybe show ACTIVE?
            // Let's default to ACTIVE if not specified.
            query.andWhere('fp.status = :defaultStatus', { defaultStatus: FollowUpStatus.VISITOR });
        }

        if (!canViewAll) {
            // Member assigned: Only see assigned to me
            // AND status must not be HIDDEN? Or they can see hidden if assigned?
            // Usually hidden means "removed". So maybe not.
            query.andWhere('fp.assignedMemberId = :viewerId', { viewerId: viewerMemberId });
        }

        return query.getMany();
    }

    async search(churchId: string, queryStr: string) {
        // If empty query, return recent 15
        if (!queryStr) {
            return this.personRepo.createQueryBuilder('fp')
                .leftJoinAndSelect('fp.assignedMember', 'am')
                .leftJoinAndSelect('am.person', 'amp')
                .leftJoinAndSelect('fp.convertedMember', 'cm')
                .where('fp.churchId = :churchId', { churchId })
                .andWhere('cm.id IS NULL')
                .orderBy('fp.createdAt', 'DESC')
                .limit(15)
                .getMany();
        }

        return this.personRepo.createQueryBuilder('fp')
            .leftJoinAndSelect('fp.assignedMember', 'am')
            .leftJoinAndSelect('am.person', 'amp')
            .leftJoinAndSelect('fp.convertedMember', 'cm')
            .where('fp.churchId = :churchId', { churchId })
            .andWhere('cm.id IS NULL')
            .andWhere('(LOWER(fp.firstName) LIKE :q OR LOWER(fp.lastName) LIKE :q OR LOWER(fp.email) LIKE :q)', { q: `%${queryStr.toLowerCase()}%` })
            .limit(20)
            .getMany();
    }

    async assignMember(personId: string, memberId: string | null, actorRoles: string[]) {
        // Only Admin/Pastor/Deacon
        if (!this.canManage(actorRoles)) throw new ForbiddenException('No tienes permisos para asignar.');

        const person = await this.personRepo.findOne({ where: { id: personId } });
        if (!person) throw new NotFoundException('Persona no encontrada');

        if (memberId) {
            const member = await this.memberRepo.findOne({ where: { id: memberId } });
            if (!member) throw new NotFoundException('Miembro no encontrado');
            person.assignedMember = member;
        } else {
            person.assignedMember = null;
        }

        return this.personRepo.save(person);
    }

    async setStatus(personId: string, status: FollowUpStatus, actorRoles: string[]) {
        // Only Admin/Pastor/Deacon
        if (!this.canManage(actorRoles)) throw new ForbiddenException('No tienes permisos para cambiar estado.');

        const person = await this.personRepo.findOne({ where: { id: personId } });
        if (!person) throw new NotFoundException('Persona no encontrada');

        person.status = status;
        return this.personRepo.save(person);
    }

    async update(personId: string, data: Partial<FollowUpPerson>, actorRoles: string[]) {
        if (!this.canManage(actorRoles)) throw new ForbiddenException('No tienes permisos para editar.');

        const person = await this.personRepo.findOne({ where: { id: personId } });
        if (!person) throw new NotFoundException('Persona no encontrada');

        Object.assign(person, data);
        return this.personRepo.save(person);
    }

    async remove(personId: string, actorRoles: string[]) {
        // Only Admin/Pastor/Deacon
        if (!this.canManage(actorRoles)) throw new ForbiddenException('No tienes permisos para eliminar.');

        const person = await this.personRepo.findOne({ where: { id: personId } });
        if (!person) throw new NotFoundException('Persona no encontrada');

        return this.personRepo.delete(personId);
    }

    private canManage(roles: string[]): boolean {
        return roles.includes('PASTOR') || roles.includes('ADMIN_APP') || roles.includes('DEACON') || roles.includes('ADMIN_CHURCH');
    }

    async promoteToMember(personId: string, actorRoles: string[]) {
        if (!this.canManage(actorRoles)) {
            throw new ForbiddenException('No tienes permisos para promover a miembro');
        }

        const visitor = await this.personRepo.findOne({ where: { id: personId }, relations: ['church', 'convertedMember'] });
        if (!visitor) throw new NotFoundException('Visitante no encontrado');

        if (visitor.convertedMember) {
            throw new ConflictException('Este visitante ya fue promovido a miembro');
        }

        // 1. Create Member via MembersService
        const newMember = await this.membersService.createFromVisitor(visitor, visitor.church.id);

        // 2. Link & Archive Visitor
        visitor.convertedMember = newMember;
        visitor.status = FollowUpStatus.ARCHIVED; // Mark as done/archived

        await this.personRepo.save(visitor);

        return newMember;
    }
}
