import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

import { User } from '../users/entities/user.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { Family } from '../families/entities/family.entity';

import { SmallGroup } from '../small-groups/entities/small-group.entity';
import { SmallGroupMember } from '../small-groups/entities/small-group-member.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { Person } from '../users/entities/person.entity';
import { FamilyMember } from '../families/entities/family-member.entity';
import { Account } from '../treasury/entities/account.entity';
import { CareProcess } from '../counseling/entities/care-process.entity';
import { CareParticipant } from '../counseling/entities/care-participant.entity';
import { CareNote } from '../counseling/entities/care-note.entity';
import { CareSession } from '../counseling/entities/care-session.entity';
import { Book } from '../library/entities/book.entity';
import { Loan } from '../library/entities/loan.entity';
import { FollowUpPerson } from 'src/follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from 'src/courses/entities/person-invited.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Church,
      ChurchMember,
      SmallGroup,
      SmallGroupMember,
      Family,
      FamilyMember,
      TreasuryTransaction,
      Person,
      Account,
      CareProcess,
      CareParticipant,
      CareNote,
      CareSession,
      Book,
      Loan,
      PersonInvited,
      FollowUpPerson
    ])
  ],
  controllers: [SeedController],
  providers: [SeedService]
})
export class SeedModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) { }

  async onModuleInit() {
    // Run seed on startup (check inside service ensures no duplicates)
    await this.seedService.run();
  }
}
