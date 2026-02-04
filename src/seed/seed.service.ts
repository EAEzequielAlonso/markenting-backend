import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';

import { User } from '../users/entities/user.entity';
// ... (rest of imports same)
import { Person } from '../users/entities/person.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { SmallGroup } from '../small-groups/entities/small-group.entity';
import { SmallGroupMember } from '../small-groups/entities/small-group-member.entity';
import { Family } from '../families/entities/family.entity';
import { FamilyMember } from '../families/entities/family-member.entity';
import { TreasuryTransaction, TransactionStatus } from '../treasury/entities/treasury-transaction.entity';
import { Account } from '../treasury/entities/account.entity';
import { CareProcess } from '../counseling/entities/care-process.entity';
import { CareParticipant } from '../counseling/entities/care-participant.entity';
import { CareNote } from '../counseling/entities/care-note.entity';
import { CareSession } from '../counseling/entities/care-session.entity';
import { Book } from '../library/entities/book.entity';
import { Loan } from '../library/entities/loan.entity';
import { FollowUpPerson } from '../follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from '../courses/entities/person-invited.entity';
import { PlanType, SubscriptionStatus, MembershipStatus, EcclesiasticalRole, FunctionalRole, SystemRole, Sex, MaritalStatus, SmallGroupRole, FamilyRole, TransactionType, AccountType, CareProcessType, CareProcessStatus, CareParticipantRole, CareNoteVisibility, FollowUpStatus } from '../common/enums';
import { BookOwnershipType, BookStatus, LoanStatus } from '../common/enums/library.enums';

@Injectable()
export class SeedService {
    private readonly logger = new Logger('SeedService');

    constructor(
        private dataSource: DataSource,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Person) private personRepository: Repository<Person>,
        @InjectRepository(Church) private churchRepository: Repository<Church>,
        @InjectRepository(ChurchMember) private memberRepository: Repository<ChurchMember>,
        @InjectRepository(SmallGroup) private groupRepository: Repository<SmallGroup>,
        @InjectRepository(SmallGroupMember) private groupMemberRepository: Repository<SmallGroupMember>,
        @InjectRepository(Family) private familyRepository: Repository<Family>,
        @InjectRepository(FamilyMember) private familyMemberRepository: Repository<FamilyMember>,
        @InjectRepository(TreasuryTransaction) private treasuryRepository: Repository<TreasuryTransaction>,
        @InjectRepository(Account) private accountRepository: Repository<Account>,
        @InjectRepository(CareProcess) private careProcessRepository: Repository<CareProcess>,
        @InjectRepository(CareParticipant) private careParticipantRepository: Repository<CareParticipant>,
        @InjectRepository(CareNote) private careNoteRepository: Repository<CareNote>,
        @InjectRepository(Book) private bookRepository: Repository<Book>,
        @InjectRepository(Loan) private loanRepository: Repository<Loan>,
        @InjectRepository(FollowUpPerson) private followUpRepository: Repository<FollowUpPerson>,
        @InjectRepository(PersonInvited) private invitedRepository: Repository<PersonInvited>,
    ) { }

    async run() {
        this.logger.log('Starting seeding process...');

        // Use path.resolve to point to the actual SOURCE file, NOT the compiled one in dist, 
        // to be 100% sure we read what the user modified.
        const seedDataPath = path.resolve(process.cwd(), 'src', 'seed', 'data', 'initial-seed.json');

        let seedData;
        try {
            const rawData = fs.readFileSync(seedDataPath, 'utf8');
            seedData = JSON.parse(rawData);
            this.logger.log(`Seed data loaded from JS disk. Churches found: ${seedData.churches.length}`);
        } catch (e) {
            this.logger.error(`Could not load seed data from ${seedDataPath}: ${e.message}`);
            return;
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            for (const churchData of seedData.churches) {
                let savedChurch = await this.churchRepository.findOne({ where: { slug: churchData.slug } });

                if (savedChurch) {
                    this.logger.log(`Church ${churchData.name} already exists. Checking for updates...`);
                } else {
                    this.logger.log(`Creating Church: ${churchData.name}`);
                    const church = this.churchRepository.create({
                        name: churchData.name,
                        slug: churchData.slug,
                        plan: PlanType.PRO,
                        subscriptionStatus: SubscriptionStatus.ACTIVE,
                        address: 'Calle Falsa 123',
                        city: 'Buenos Aires',
                        country: 'Argentina'
                    });
                    savedChurch = await queryRunner.manager.save(church);
                }

                // Admin Loop
                this.logger.log(`Checking Admin: ${churchData.adminEmail}`);
                let adminPerson = await this.personRepository.findOne({ where: { email: churchData.adminEmail } });
                if (!adminPerson) {
                    const [firstName, ...lastNameParts] = churchData.adminName.split(' ');
                    const lastName = lastNameParts.join(' ');

                    adminPerson = this.personRepository.create({
                        firstName: firstName,
                        lastName: lastName,
                        fullName: churchData.adminName,
                        email: churchData.adminEmail,
                        avatarUrl: faker.image.avatar()
                    });
                    adminPerson = await queryRunner.manager.save(adminPerson);
                }

                let adminUser = await this.userRepository.findOne({ where: { email: churchData.adminEmail } });
                if (!adminUser) {
                    const hashedPassword = await bcrypt.hash('123456', 10);
                    adminUser = this.userRepository.create({
                        email: churchData.adminEmail,
                        password: hashedPassword,
                        systemRole: SystemRole.USER,
                        isOnboarded: true,
                        person: adminPerson
                    });
                    await queryRunner.manager.save(adminUser);
                }

                // Church Admin Membership
                let adminMember = await this.memberRepository.findOne({
                    where: { person: { id: adminPerson.id }, church: { id: savedChurch.id } }
                });

                if (!adminMember) {
                    adminMember = this.memberRepository.create({
                        person: adminPerson,
                        church: savedChurch,
                        ecclesiasticalRole: EcclesiasticalRole.PASTOR,
                        functionalRoles: [FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.COUNSELOR, FunctionalRole.MINISTRY_LEADER],
                        status: MembershipStatus.MEMBER,
                        isAuthorizedCounselor: true,
                        joinedAt: new Date()
                    });
                    await queryRunner.manager.save(adminMember);
                } else {
                    // FIX: Ensure roles are populated for Admin if empty or just NONE (migration fix)
                    let updated = false;
                    if (!adminMember.ecclesiasticalRole || adminMember.ecclesiasticalRole === EcclesiasticalRole.NONE) {
                        adminMember.ecclesiasticalRole = EcclesiasticalRole.PASTOR;
                        updated = true;
                    }
                    if (!adminMember.functionalRoles || adminMember.functionalRoles.length <= 1) { // Default is [MEMBER]
                        adminMember.functionalRoles = [FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.COUNSELOR, FunctionalRole.MINISTRY_LEADER];
                        updated = true;
                    }
                    if (updated) await queryRunner.manager.save(adminMember);
                }


                // Create Members
                this.logger.log(`Checking Members for ${churchData.name}...`);

                // Map to store Users for Group/Family seeding
                const emailToUserMap = new Map<string, User>();
                const emailToMemberMap = new Map<string, ChurchMember>();
                emailToUserMap.set(churchData.adminEmail, adminUser); // Add admin
                emailToMemberMap.set(churchData.adminEmail, adminMember);

                for (const mData of churchData.members) {
                    let person = await this.personRepository.findOne({ where: { email: mData.email } });
                    if (!person) {
                        const [firstName, ...lastNameParts] = mData.name.split(' ');
                        const lastName = lastNameParts.join(' ');

                        person = this.personRepository.create({
                            firstName: firstName,
                            lastName: lastName,
                            fullName: mData.name,
                            email: mData.email,
                            avatarUrl: faker.image.avatar(),
                            sex: faker.helpers.enumValue(Sex),
                            maritalStatus: faker.helpers.enumValue(MaritalStatus),
                            phoneNumber: faker.phone.number(),
                            addressLine1: faker.location.streetAddress()
                        });
                        person = await queryRunner.manager.save(person);
                    }

                    let user = await this.userRepository.findOne({ where: { email: mData.email } });
                    if (!user) {
                        const hashedPassword = await bcrypt.hash('123456', 10);
                        user = this.userRepository.create({
                            email: mData.email,
                            password: hashedPassword,
                            systemRole: SystemRole.USER,
                            isOnboarded: true,
                            person: person
                        });
                        user = await queryRunner.manager.save(user);
                    }
                    emailToUserMap.set(mData.email, user);

                    let member = await this.memberRepository.findOne({
                        where: { person: { id: person.id }, church: { id: savedChurch.id } }
                    });

                    if (member) {
                        const shouldUpdate = !member.ecclesiasticalRole ||
                            member.ecclesiasticalRole === EcclesiasticalRole.NONE && mData.ecclesiasticalRole !== EcclesiasticalRole.NONE;

                        // Migration logic for functional roles
                        const shouldMigrate = !member.functionalRoles || member.functionalRoles.length === 1 && member.functionalRoles[0] === FunctionalRole.MEMBER;

                        if (shouldUpdate || shouldMigrate) {
                            if (shouldUpdate) {
                                member.ecclesiasticalRole = mData.ecclesiasticalRole as EcclesiasticalRole || EcclesiasticalRole.NONE;
                            }
                            // Auto-assign functional roles based on ecclesiastical for migration
                            if (member.ecclesiasticalRole === EcclesiasticalRole.PASTOR) {
                                member.functionalRoles = [FunctionalRole.ADMIN_CHURCH, FunctionalRole.AUDITOR, FunctionalRole.COUNSELOR];
                            }
                            // Map old ecclesiastical roles to functional roles if needed
                            /*
                            if (member.ecclesiasticalRole === 'TREASURER') {
                                functionalRoles.push(FunctionalRole.TREASURER); 
                            }
                            */ else {
                                member.functionalRoles = [FunctionalRole.MEMBER];
                            }

                            await queryRunner.manager.save(member);
                            this.logger.log(`Updated roles for member: ${mData.email}`);
                        }
                    } else {
                        member = this.memberRepository.create({
                            person: person,
                            church: savedChurch,
                            ecclesiasticalRole: mData.ecclesiasticalRole as EcclesiasticalRole || EcclesiasticalRole.NONE,
                            functionalRoles: mData.functionalRoles?.map(r => FunctionalRole[r as keyof typeof FunctionalRole]) || [FunctionalRole.MEMBER],
                            status: mData.status as MembershipStatus || MembershipStatus.MEMBER,
                            isAuthorizedCounselor: mData.isCounselor || false,
                            joinedAt: faker.date.past()
                        });
                        member = await queryRunner.manager.save(member);
                    }
                    emailToMemberMap.set(mData.email, member);
                }

                // Seed Treasury
                if (churchData.treasury) {
                    this.logger.log(`Creating Treasury data for ${churchData.name}...`);
                    const accountMap = new Map<string, Account>();

                    for (const accData of churchData.treasury.accounts) {
                        let account = await this.accountRepository.findOne({
                            where: { name: accData.name, church: { id: savedChurch.id } }
                        });
                        if (!account) {
                            account = this.accountRepository.create({
                                name: accData.name,
                                type: accData.type as AccountType,
                                currency: accData.currency,
                                balance: accData.balance,
                                church: savedChurch
                            });
                            account = await queryRunner.manager.save(account);
                        }
                        accountMap.set(accData.name, account);
                    }

                    for (const txData of churchData.treasury.transactions) {
                        const sourceAcc = accountMap.get(txData.source);
                        const destAcc = accountMap.get(txData.dest);

                        if (sourceAcc && destAcc) {
                            // Deduplication Check
                            const existingTx = await this.treasuryRepository.findOne({
                                where: {
                                    description: txData.description,
                                    amount: txData.amount,
                                    sourceAccount: { id: sourceAcc.id },
                                    destinationAccount: { id: destAcc.id },
                                    church: { id: savedChurch.id }
                                }
                            });

                            if (!existingTx) {
                                const tx = this.treasuryRepository.create({
                                    description: txData.description,
                                    amount: txData.amount,
                                    currency: txData.currency,
                                    exchangeRate: txData.rate || 1,
                                    sourceAccount: sourceAcc,
                                    destinationAccount: destAcc,
                                    church: savedChurch,
                                    status: TransactionStatus.COMPLETED,
                                    date: new Date()
                                });
                                await queryRunner.manager.save(tx);
                            } else {
                                this.logger.log(`Skipping existing transaction: ${txData.description}`);
                            }
                        }
                    }
                }

                // Seed Counseling (Care module)
                if (churchData.counselingProcesses) {
                    this.logger.log(`Creating Counseling data for ${churchData.name}...`);
                    for (const cpData of churchData.counselingProcesses) {
                        const counselor = emailToMemberMap.get(cpData.counselorEmail);
                        const counselee = emailToMemberMap.get(cpData.counseleeEmail);

                        if (counselor && counselee) {
                            // Simple check if process exists for these two recently?
                            // Or just rely on clean DB? For now, let's just duplicates check or assume clean.
                            // Given user request only mentioned Treasury and Groups specifically, I'll focus there.
                            // But let's at least check if an ACTIVE process exists? 
                            // To be safe and minimal change: keeping existing counseling logic or wrapping?
                            // User asked specifically for "datos de tesoreria" and "grupo pequeño".
                            const process = this.careProcessRepository.create({
                                type: cpData.type as CareProcessType,
                                status: cpData.status as CareProcessStatus,
                                motive: cpData.motive,
                                church: savedChurch,
                                startDate: new Date()
                            });
                            const savedProcess = await queryRunner.manager.save(process);

                            // Participants
                            const p1 = this.careParticipantRepository.create({
                                process: savedProcess,
                                member: counselor,
                                role: CareParticipantRole.COUNSELOR
                            });
                            const p2 = this.careParticipantRepository.create({
                                process: savedProcess,
                                member: counselee,
                                role: CareParticipantRole.COUNSELEE
                            });
                            await queryRunner.manager.save([p1, p2]);

                            // Notes
                            if (cpData.notes) {
                                for (const noteText of cpData.notes) {
                                    const note = this.careNoteRepository.create({
                                        process: savedProcess,
                                        author: counselor,
                                        content: noteText,
                                        visibility: CareNoteVisibility.SHARED
                                    });
                                    await queryRunner.manager.save(note);
                                }
                            }
                        }
                    }
                }

                // Seed Library
                if (churchData.library) {
                    this.logger.log(`📚 Found Library section with ${churchData.library.books.length} books. Processing...`);
                    const bookMap = new Map<string, Book>();

                    for (const bookData of churchData.library.books) {
                        let savedBook = await this.bookRepository.findOne({ where: { title: bookData.title, church: { id: savedChurch.id } } });

                        if (!savedBook) {
                            const book = this.bookRepository.create({
                                title: bookData.title,
                                author: bookData.author,
                                category: bookData.category,
                                description: bookData.description,
                                isbn: bookData.isbn,
                                coverUrl: bookData.coverUrl, // Imagen de libro elegante
                                ownershipType: BookOwnershipType.CHURCH,
                                status: BookStatus.AVAILABLE,
                                church: savedChurch,
                                code: `LIB-${faker.number.int({ min: 100, max: 999 })}`
                            });
                            savedBook = await queryRunner.manager.save(book);
                        }
                        bookMap.set(bookData.title, savedBook);
                    }

                    if (churchData.library.loans) {
                        for (const loanData of churchData.library.loans) {
                            const book = bookMap.get(loanData.bookTitle);
                            const member = emailToMemberMap.get(loanData.memberEmail);

                            if (book && member) {
                                // Check if active loan exists
                                const activeLoan = await this.loanRepository.findOne({
                                    where: {
                                        book: { id: book.id },
                                        status: LoanStatus.ACTIVE
                                    }
                                });

                                if (!activeLoan) {
                                    const loan = this.loanRepository.create({
                                        book: book,
                                        borrower: member,
                                        outDate: new Date(),
                                        dueDate: faker.date.future(),
                                        status: LoanStatus.ACTIVE
                                    });
                                    await queryRunner.manager.save(loan);

                                    // Update book status
                                    book.status = BookStatus.LOANED;
                                    await queryRunner.manager.save(book);
                                }
                            }
                        }
                    }
                }

                // Seed Small Groups
                if (churchData.smallGroups) {
                    this.logger.log(`Creating Small Groups for ${churchData.name}...`);
                    for (const groupData of churchData.smallGroups) {
                        let savedGroup = await this.groupRepository.findOne({
                            where: { name: groupData.name, church: { id: savedChurch.id } }
                        });

                        if (savedGroup) {
                            this.logger.log(`Group ${groupData.name} already exists. Skipping...`);
                            continue;
                        }

                        const group = this.groupRepository.create({
                            name: groupData.name,
                            description: groupData.description || 'Grupo de Crecimiento',
                            objective: groupData.objective,
                            studyMaterial: groupData.studyMaterial,
                            currentTopic: groupData.currentTopic,
                            meetingDay: groupData.meetingDay,
                            meetingTime: groupData.meetingTime,
                            address: groupData.address,
                            openEnrollment: groupData.openEnrollment || false,
                            church: savedChurch
                        });
                        savedGroup = await queryRunner.manager.save(group);

                        // Add Leader
                        const leaderMember = emailToMemberMap.get(groupData.leaderEmail);
                        if (leaderMember) {
                            const groupMember = this.groupMemberRepository.create({
                                member: leaderMember,
                                group: savedGroup,
                                role: SmallGroupRole.MODERATOR,
                                joinedAt: new Date()
                            });
                            await queryRunner.manager.save(groupMember);
                        }

                        // Add Members
                        if (groupData.membersEmails) {
                            for (const email of groupData.membersEmails) {
                                const member = emailToMemberMap.get(email);
                                if (member) {
                                    const groupMember = this.groupMemberRepository.create({
                                        member: member,
                                        group: savedGroup,
                                        role: SmallGroupRole.PARTICIPANT,
                                        joinedAt: new Date()
                                    });
                                    await queryRunner.manager.save(groupMember);
                                }
                            }
                        }
                    }
                }

                // Seed FollowUp Persons (Visitors/Seguimiento)
                if (churchData.followUpPeople) {
                    this.logger.log(`Creating FollowUp People for ${churchData.name}...`);
                    for (const fpData of churchData.followUpPeople) {
                        // Check strict duplicity by email or first+last name if no email
                        let existing = null;
                        if (fpData.email) {
                            existing = await this.followUpRepository.findOne({
                                where: { email: fpData.email, church: { id: savedChurch.id } }
                            });
                        } else {
                            existing = await this.followUpRepository.findOne({
                                where: { firstName: fpData.firstName, lastName: fpData.lastName, church: { id: savedChurch.id } }
                            });
                        }

                        if (!existing) {
                            const followUp = this.followUpRepository.create({
                                firstName: fpData.firstName,
                                lastName: fpData.lastName,
                                email: fpData.email,
                                phone: fpData.phone,
                                status: fpData.status as FollowUpStatus || FollowUpStatus.VISITOR,
                                church: savedChurch,
                                firstVisitDate: faker.date.past()
                            });
                            await queryRunner.manager.save(followUp);
                        }
                    }
                }

                // Seed PersonInvited (Just global history, but unrelated to specific church in entity definition... 
                // Wait, PersonInvited schema does NOT have Church relation in the entity provided above.
                // Checking PersonInvited entity definition confirms NO church column.
                // Assuming global or implicitly handled? For now just seeding them raw if they don't exist.)
                if (churchData.invitedPeople) {
                    this.logger.log(`Creating Invited People History...`);
                    for (const ipData of churchData.invitedPeople) {
                        let existing = null;
                        if (ipData.email) {
                            existing = await this.invitedRepository.findOne({ where: { email: ipData.email } });
                        }

                        if (!existing) {
                            const invited = this.invitedRepository.create({
                                firstName: ipData.firstName,
                                lastName: ipData.lastName,
                                email: ipData.email,
                                phone: ipData.phone
                            });
                            await queryRunner.manager.save(invited);
                        }
                    }
                }

                // Seed Families

                // Seed Families
                if (churchData.families) {
                    this.logger.log(`Creating Families for ${churchData.name}...`);
                    for (const familyData of churchData.families) {
                        const family = this.familyRepository.create({
                            name: familyData.name,
                            church: savedChurch
                        });
                        const savedFamily = await queryRunner.manager.save(family);

                        // Add Head
                        // Add Head
                        const headUser = emailToUserMap.get(familyData.headEmail);
                        if (headUser) {
                            const headChurchMember = await queryRunner.manager.findOne(ChurchMember, {
                                where: { person: { user: { id: headUser.id } }, church: { id: savedChurch.id } }
                            });

                            if (headChurchMember) {
                                const headMember = this.familyMemberRepository.create({
                                    member: headChurchMember,
                                    family: savedFamily,
                                    role: FamilyRole.FATHER,
                                    joinedAt: new Date()
                                });
                                await queryRunner.manager.save(headMember);
                            }
                        }

                        // Add Members
                        if (familyData.membersEmails) {
                            for (const email of familyData.membersEmails) {
                                const memberUser = emailToUserMap.get(email);
                                if (memberUser) {
                                    const churchMember = await queryRunner.manager.findOne(ChurchMember, {
                                        where: { person: { user: { id: memberUser.id } }, church: { id: savedChurch.id } }
                                    });

                                    if (churchMember) {
                                        const famMember = this.familyMemberRepository.create({
                                            member: churchMember,
                                            family: savedFamily,
                                            role: FamilyRole.CHILD, // Default to CHILD for now
                                            joinedAt: new Date()
                                        });
                                        await queryRunner.manager.save(famMember);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            await queryRunner.commitTransaction();
            this.logger.log('Seeding completed successfully! (Churches, Members and Library updated)');
            return { message: 'Seeding successful' };

        } catch (err) {
            this.logger.error('Seeding failed', err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
