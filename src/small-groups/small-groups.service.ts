import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { User } from '../users/entities/user.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { SmallGroupRole } from '../common/enums';

@Injectable()
export class SmallGroupsService {
    constructor(
        @InjectRepository(SmallGroup)
        private groupRepository: Repository<SmallGroup>,
        @InjectRepository(SmallGroupMember)
        private groupMemberRepository: Repository<SmallGroupMember>,
    ) { }

    async create(createDto: any, churchId: string) {
        const group = this.groupRepository.create({
            ...createDto,
            church: { id: churchId },
        });
        const savedGroup = await this.groupRepository.save(group) as unknown as SmallGroup;

        // Leader generic logic needs to be updated if leaderId is passed. 
        // leaderId typically refers to User ID in frontend creation.
        // But now we need ChurchMember ID. 
        // We will assume for now leaderId passed is still User ID? 
        // Or if the frontend sends ChurchMember ID?
        // Usually CreateGroupDialog sends Meeting details but not Leader manually.
        // Let's check CreateGroupDialog. It doesn't seem to set Leader yet.
        // So we can ignore or assume leaderId is ChurchMemberID.
        // But for safety, let's keep it commented or minimal.

        // if (createDto.leaderId) {
        //     const member = this.groupMemberRepository.create({
        //         group: savedGroup,
        //         member: { id: createDto.leaderId } as ChurchMember, // Assuming this is memberId
        //         role: SmallGroupRole.MODERATOR
        //     });
        //     await this.groupMemberRepository.save(member);
        // }

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
            relations: ['members', 'members.member', 'members.member.person', 'events', 'events.attendees'],
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

        const groupMember = this.groupMemberRepository.create({
            group,
            member: { id: memberId } as ChurchMember, // changed from user to member
            role
        });
        return this.groupMemberRepository.save(groupMember);
    }

    async removeMember(groupId: string, memberId: string) {
        const groupMember = await this.groupMemberRepository.findOne({
            where: {
                group: { id: groupId },
                member: { id: memberId }, // changed from user to member
            }
        });

        if (!groupMember) throw new NotFoundException('Member not found in this group');
        return this.groupMemberRepository.remove(groupMember);
    }
}
