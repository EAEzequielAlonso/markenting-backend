import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChurchMember } from '../members/entities/church-member.entity';
import { SmallGroup } from '../small-groups/entities/small-group.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { FollowUpPerson } from '../follow-ups/entities/follow-up-person.entity';
import { TransactionType, FollowUpStatus, AccountType } from '../common/enums';
import { WorshipService, ServiceStatus } from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { Repository, Between, MoreThan } from 'typeorm';
import * as dateFns from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(ChurchMember) private memberRepository: Repository<ChurchMember>,
        @InjectRepository(SmallGroup) private groupRepository: Repository<SmallGroup>,
        @InjectRepository(TreasuryTransaction) private treasuryRepository: Repository<TreasuryTransaction>,
        @InjectRepository(FollowUpPerson) private followUpRepository: Repository<FollowUpPerson>,
        @InjectRepository(WorshipService) private worshipRepo: Repository<WorshipService>,
        @InjectRepository(CalendarEvent) private eventRepo: Repository<CalendarEvent>,
    ) { }

    async getStats(churchId: string) {
        // 1. Members Count
        const membersCount = await this.memberRepository.count({
            where: { church: { id: churchId } }
        });

        // Previous month members comparisons could be complex depending on if we have history. 
        // For MVP, we'll just mock the growth or calculate based on joinedAt if available.
        // Let's rely on joinedAt if it exists.
        const lastMonth = dateFns.subMonths(new Date(), 1);
        const newMembersLast30Days = await this.memberRepository.count({
            where: {
                church: { id: churchId },
                joinedAt: Between(dateFns.startOfMonth(lastMonth), new Date())
            }
        });

        // 2. Groups
        const groupsCount = await this.groupRepository.count({
            where: { church: { id: churchId } }
        });

        // 3. Treasury (Income this month)
        const start = dateFns.startOfMonth(new Date());
        const end = dateFns.endOfMonth(new Date());

        const incomeResult = await this.treasuryRepository
            .createQueryBuilder('tx')
            .leftJoin('tx.sourceAccount', 'source')
            .select('SUM(tx.amount)', 'total')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('source.type = :type', { type: AccountType.INCOME })
            .andWhere('tx.date BETWEEN :start AND :end', { start, end })
            .getRawOne();

        const monthlyIncome = parseFloat(incomeResult?.total || 0);

        // 4. Follow Ups (New Visitors)
        const newVisitorsCount = await this.followUpRepository.count({
            where: {
                church: { id: churchId },
                status: FollowUpStatus.VISITOR
            }
        });

        return {
            members: {
                total: membersCount,
                newLastMonth: newMembersLast30Days,
                growthPercentage: membersCount > 0 ? Math.round((newMembersLast30Days / membersCount) * 100) : 0
            },
            groups: {
                total: groupsCount,
                active: groupsCount, // Assuming all are active for now
            },
            treasury: {
                monthlyIncome: monthlyIncome,
                currency: 'USD' // Or church setting
            },
            visitors: {
                new: newVisitorsCount,
                pending: newVisitorsCount
            }
        };
    }

    async getUpcomingEvents(churchId: string) {
        // 1. Get Confirmed Worship Services (Future)
        const services = await this.worshipRepo.find({
            where: {
                church: { id: churchId },
                status: ServiceStatus.CONFIRMED,
                date: MoreThan(new Date())
            },
            take: 5,
            order: { date: 'ASC' }
        });

        // 2. Get Calendar Events (Future) - Activities, Courses, etc.
        const events = await this.eventRepo.find({
            where: {
                church: { id: churchId },
                startDate: MoreThan(new Date())
            },
            relations: ['session', 'session.course'], // Load relations
            take: 5,
            order: { startDate: 'ASC' }
        });

        // 3. Merge and Sort
        const combined = [
            ...services.map(s => ({
                id: s.id,
                type: 'WORSHIP',
                title: s.topic || 'Culto General',
                date: s.date,
                location: 'Auditorio',
                link: `/worship/${s.id}`,
                meta: {}
            })),
            ...events.map(e => {
                let link = '/calendar';
                if (e.session?.course) {
                    if (e.type === 'ACTIVITY') link = `/activities/${e.session.course.id}`;
                    else if (e.type === 'COURSE') link = `/courses/${e.session.course.id}`;
                }

                return {
                    id: e.id,
                    type: e.type,
                    title: e.title,
                    date: e.startDate,
                    location: e.location,
                    link, // Generated link
                    meta: { courseId: e.session?.course?.id }
                };
            })
        ];

        // Sort by date ASC
        combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Return top 5
        return combined.slice(0, 5);
    }
}
