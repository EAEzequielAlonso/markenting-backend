import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamiliesService } from './families.service';
import { FamiliesController } from './families.controller';
import { Family } from './entities/family.entity';
import { FamilyMember } from './entities/family-member.entity';
import { MembersModule } from '../members/members.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Family, FamilyMember]),
        MembersModule
    ],
    controllers: [FamiliesController],
    providers: [FamiliesService],
    exports: [FamiliesService]
})
export class FamiliesModule { }
