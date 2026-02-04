import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { SmallGroupGuest } from './entities/small-group-guest.entity';
import { User } from '../users/entities/user.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { FollowUpPerson } from '../follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from '../courses/entities/person-invited.entity';
import { SmallGroupRole } from '../common/enums';

@Injectable()
export class SmallGroupsService {
    constructor(
        @InjectRepository(SmallGroup)
        private groupRepository: Repository<SmallGroup>,
        @InjectRepository(SmallGroupMember)
        private groupMemberRepository: Repository<SmallGroupMember>,
        @InjectRepository(SmallGroupGuest)
        private groupGuestRepository: Repository<SmallGroupGuest>,
    ) { }

    async create(createDto: any, churchId: string) {
        const group = this.groupRepository.create({
            ...createDto,
            church: { id: churchId },
        });
        const savedGroup = await this.groupRepository.save(group) as unknown as SmallGroup;
        return savedGroup;
    }

    async findAll(churchId: string) {
        return this.groupRepository.find({
            where: { church: { id: churchId } },
            relations: ['members', 'members.member', 'members.member.person'],
        });
    }

    async findOne(id: string) {
        const group = await this.groupRepository.findOne({
            where: { id },
            relations: [
                'members',
                'members.member',
                'members.member.person',
                'events',
                'events.attendees',
                'guests',
                'guests.followUpPerson',
                'guests.followUpPerson.personInvited',
                'guests.followUpPerson.personInvited.person',
                'guests.personInvited',
                'guests.personInvited.person',
            ],
        });
        if (!group) throw new NotFoundException(`Small Group with ID ${id} not found`);
        return group;
    }

    async update(id: string, updateDto: any) {
        const group = await this.groupRepository.preload({
            id,
            ...updateDto,
        });
        if (!group) throw new NotFoundException(`Small Group with ID ${id} not found`);
        return this.groupRepository.save(group);
    }

    async remove(id: string) {
        const group = await this.findOne(id);
        return this.groupRepository.remove(group);
    }

    async addMember(groupId: string, memberId: string, role: SmallGroupRole = SmallGroupRole.PARTICIPANT) {
        const group = await this.findOne(groupId);

        // Check if already exists
        const existing = await this.groupMemberRepository.findOne({
            where: {
                group: { id: groupId },
                member: { id: memberId }
            }
        });
        if (existing) return existing;

        const groupMember = this.groupMemberRepository.create({
            group,
            member: { id: memberId } as ChurchMember,
            role
        });
        return this.groupMemberRepository.save(groupMember);
    }

    async removeMember(groupId: string, memberId: string) {
        const groupMember = await this.groupMemberRepository.findOne({
            where: {
                group: { id: groupId },
                member: { id: memberId },
            }
        });

        if (!groupMember) throw new NotFoundException('Member not found in this group');
        return this.groupMemberRepository.remove(groupMember);
    }

    async addGuest(groupId: string, guestDto: {
        fullName?: string,
        email?: string,
        followUpPersonId?: string,
        personInvitedId?: string
    }) {
        const group = await this.findOne(groupId);

        let guestName = guestDto.fullName;

        // If linking to a known entity, get name from there if not provided
        if (guestDto.followUpPersonId && !guestName) {
            // In a real scenario we might fetch the person to get the name, 
            // but for now we assume the DTO provides enough or we implement fetching logic if crucial.
            // Simplified: we rely on what's passed or what's in the relation if we eagerly loaded it (which we define in relations).
        }

        // Check for duplicates
        if (guestDto.followUpPersonId || guestDto.personInvitedId) {
            const existing = await this.groupGuestRepository.findOne({
                where: [
                    ...(guestDto.followUpPersonId ? [{ group: { id: groupId }, followUpPerson: { id: guestDto.followUpPersonId } }] : []),
                    ...(guestDto.personInvitedId ? [{ group: { id: groupId }, personInvited: { id: guestDto.personInvitedId } }] : [])
                ]
            });

            if (existing) {
                // Return existing instead of error to be idempotent, or throw error. User asked for "no permitir", so throw error.
                throw new BadRequestException('Esta persona ya está en la lista de invitados del grupo.');
            }
        }

        const guest = this.groupGuestRepository.create({
            group,
            fullName: guestName || 'Invitado sin nombre',
            email: guestDto.email,
            followUpPerson: guestDto.followUpPersonId ? { id: guestDto.followUpPersonId } as FollowUpPerson : null,
            personInvited: guestDto.personInvitedId ? { id: guestDto.personInvitedId } as PersonInvited : null
        });

        return this.groupGuestRepository.save(guest);
    }

    async removeGuest(groupId: string, guestId: string) {
        const guest = await this.groupGuestRepository.findOne({
            where: { id: guestId, group: { id: groupId } }
        });
        if (!guest) throw new NotFoundException('Guest not found');
        return this.groupGuestRepository.remove(guest);
    }
}
