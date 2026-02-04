import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonInvited } from './entities/person-invited.entity';
import { FollowUpPerson } from '../follow-ups/entities/follow-up-person.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { Person } from '../users/entities/person.entity';
import { FollowUpStatus, ProgramType } from '../common/enums';

@Injectable()
export class PeopleFunnelService {
    constructor(
        @InjectRepository(PersonInvited) private invitedRep: Repository<PersonInvited>,
        @InjectRepository(FollowUpPerson) private followUpRep: Repository<FollowUpPerson>,
        @InjectRepository(ChurchMember) private memberRep: Repository<ChurchMember>,
        @InjectRepository(Person) private personRep: Repository<Person>,
    ) { }

    // STAGE 1: Find or Create Invited Person (Reuse identity)
    async createInvited(data: { firstName: string; lastName: string; email?: string; phone?: string }): Promise<PersonInvited> {
        return this.findOrCreateInvited(data);
    }

    async findOrCreateInvited(data: { firstName: string; lastName: string; email?: string; phone?: string }): Promise<PersonInvited> {
        // 1. Try to find by unique partial index (email or phone)
        // Note: Logic allows loose matching to correct data?
        // Basic match: Email OR Phone

        const qb = this.invitedRep.createQueryBuilder('pi');

        if (data.email) {
            qb.orWhere('pi.email = :email', { email: data.email });
        }
        if (data.phone) {
            qb.orWhere('pi.phone = :phone', { phone: data.phone });
        }

        const existing = await qb.getOne();

        if (existing) {
            // Optional: Update missing fields?
            // If existing has no email but new data has email, update it?
            // For now, simple reuse.
            return existing;
        }

        // Create new
        const newInvited = this.invitedRep.create({
            firstName: data.firstName,
            lastName: data.lastName || '',
            email: data.email,
            phone: data.phone
        });

        return this.invitedRep.save(newInvited);
    }

    async findInvited(id: string) {
        return this.invitedRep.findOne({ where: { id } });
    }

    // STAGE 2: Promote to FollowUp (Visitor)
    async promoteToFollowUp(invitedId: string, churchId: string, createdByMemberId: string): Promise<FollowUpPerson> {
        const invited = await this.invitedRep.findOne({ where: { id: invitedId } });
        if (!invited) throw new BadRequestException('Persona invitada no encontrada');

        // Check if already in follow up
        const existing = await this.followUpRep.findOne({ where: { personInvited: { id: invitedId } } });
        if (existing) return existing;

        const followUp = this.followUpRep.create({
            firstName: invited.firstName,
            lastName: invited.lastName,
            email: invited.email,
            phone: invited.phone,
            status: FollowUpStatus.VISITOR,
            church: { id: churchId },
            firstVisitDate: new Date(),
            createdByMemberId,
            personInvited: invited
        });

        return this.followUpRep.save(followUp);
    }

    // STAGE 3: Promote to Member
    async promoteToMember(invitedId: string, churchId: string): Promise<ChurchMember> {
        const invited = await this.invitedRep.findOne({ where: { id: invitedId } });
        if (!invited) throw new BadRequestException('Persona invitada no encontrada');

        // Check if already linked to a person/member
        // A PersonInvited might already be linked to a Person
        // query Person where personInvitedId = invitedId
        const existingPerson = await this.personRep.findOne({ where: { personInvited: { id: invitedId } }, relations: ['memberships'] });

        if (existingPerson) {
            // Check if member of this church
            const membership = existingPerson.memberships.find(m => m.church?.id === churchId || !m.church); // !m.church handle safer
            if (membership) return membership;

            // Create membership for existing person
            const newMember = this.memberRep.create({
                person: existingPerson,
                church: { id: churchId }
            });
            return this.memberRep.save(newMember);
        }

        // Create Person + Member
        const person = this.personRep.create({
            firstName: invited.firstName,
            lastName: invited.lastName,
            email: invited.email,
            phoneNumber: invited.phone,
            personInvited: invited
        });

        const savedPerson = await this.personRep.save(person);

        const member = this.memberRep.create({
            person: savedPerson,
            church: { id: churchId }
        });

        const savedMember = await this.memberRep.save(member);

        // Link FollowUpPerson if exists
        try {
            if (invited.followUpPerson) {
                // If the relation was loaded
                invited.followUpPerson.convertedMember = savedMember;
                await this.followUpRep.save(invited.followUpPerson);
            } else {
                // Try to find it manually if not loaded
                const fp = await this.followUpRep.findOne({ where: { personInvited: { id: invitedId } } });
                if (fp) {
                    fp.convertedMember = savedMember;
                    await this.followUpRep.save(fp);
                }
            }
        } catch (e) {
            console.error('Error linking converted member to follow up', e);
        }

        return savedMember;
    }

    async updateInvited(id: string, data: Partial<PersonInvited>) {
        const invited = await this.invitedRep.findOne({ where: { id } });
        if (!invited) throw new BadRequestException('Invitado no encontrado');
        Object.assign(invited, data);
        return this.invitedRep.save(invited);
    }

    async archiveInvited(id: string) {
        return this.invitedRep.softDelete(id);
    }

    async hardRemoveInvited(id: string) {
        // Warning: This WILL throw if there are FK constraints
        return this.invitedRep.delete(id);
    }

    async search(query: string = '', includeArchived: boolean = false) {
        const qb = this.invitedRep
            .createQueryBuilder('pi')
            .withDeleted() // Needed to access deletedAt for filtering logic if implementing "Show Only Archived" or similar. But here we want to show active by default? 
            // Wait, softDelete hides them by default unless withDeleted() is used.
            // If includeArchived is FALSE (default): we want ONLY active (deletedAt IS NULL).
            // If includeArchived is TRUE: we want ALL (Active + Archived)? Or just Archived?
            // "Filtros dinamicos... archivados o no". 
            // Controller converts 'true' -> true.

            .leftJoin('pi.followUpPerson', 'fp')
            .where('fp.id IS NULL');

        if (!includeArchived) {
            // Only active
            qb.andWhere('pi.deletedAt IS NULL');
        } else {
            // User requested to see ONLY archived when toggled
            qb.andWhere('pi.deletedAt IS NOT NULL');
        }

        if (query) {
            qb.andWhere(
                `(LOWER(pi.firstName) LIKE :q 
                OR LOWER(pi.lastName) LIKE :q 
                OR LOWER(pi.email) LIKE :q)`,
                { q: `%${query.toLowerCase()}%` },
            );
        }

        return qb
            .orderBy('pi.createdAt', 'DESC')
            .limit(20)
            .getMany();
    }
}
