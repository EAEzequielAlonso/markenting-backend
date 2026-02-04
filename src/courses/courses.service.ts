import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FollowUpPerson } from '../follow-ups/entities/follow-up-person.entity';
import { FollowUpStatus } from '../common/enums';
// Reuse existing repo injections
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseParticipant } from './entities/course-participant.entity';
import { CourseGuest } from './entities/course-guest.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { Church } from '../churches/entities/church.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { CalendarEventType, CourseStatus, CourseRole, ProgramType } from '../common/enums';
import { CreateCourseDto, CreateSessionDto, AddParticipantDto, AddGuestDto, UpdateCourseDto } from './dto/create-course.dto';
import { SessionAttendance } from './entities/session-attendance.entity';
import { ContactsService } from '../contacts/contacts.service';
import { FamiliesService } from '../families/families.service';

import { PeopleFunnelService } from './people-funnel.service';

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course) private courseRep: Repository<Course>,
        @InjectRepository(CourseSession) private sessionRep: Repository<CourseSession>,
        @InjectRepository(CourseParticipant) private participantRep: Repository<CourseParticipant>,
        @InjectRepository(CourseGuest) private guestRep: Repository<CourseGuest>,
        @InjectRepository(SessionAttendance) private attendanceRep: Repository<SessionAttendance>,
        @InjectRepository(ChurchMember) private memberRep: Repository<ChurchMember>,
        @InjectRepository(FollowUpPerson) private followUpRep: Repository<FollowUpPerson>,
        @InjectRepository(CalendarEvent) private eventRep: Repository<CalendarEvent>,
        @InjectRepository(Church) private churchRep: Repository<Church>,
        private contactsService: ContactsService,
        private peopleFunnelService: PeopleFunnelService,
        private familiesService: FamiliesService
    ) { }

    // --- COURSES ---

    async create(createDto: CreateCourseDto, creatorMemberId: string) {
        const creator = await this.memberRep.findOne({
            where: { id: creatorMemberId },
            relations: ['church']
        });
        if (!creator) throw new NotFoundException('Miembro creador no encontrado');
        if (!creator.church) throw new NotFoundException('Iglesia no encontrada');

        // Manual parsing to avoid timezone shifts
        // Input: "2024-01-23"
        const parseDate = (dateStr: string) => {
            if (!dateStr) return undefined;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0); // Local noon
        };

        const course = this.courseRep.create({
            title: createDto.title,
            description: createDto.description,
            category: createDto.category,
            type: createDto.type || ProgramType.COURSE, // Default to COURSE
            startDate: parseDate(createDto.startDate),
            endDate: parseDate(createDto.endDate),
            capacity: createDto.capacity,
            color: createDto.color,
            church: creator.church,
            createdBy: creator,
            status: CourseStatus.ACTIVE
        });

        return this.courseRep.save(course);
    }

    async findAll(memberId: string, roles: string[], type?: ProgramType) {
        const isAdminOrPastor = roles.includes('ADMIN_APP') ||
            roles.includes('PASTOR') ||
            roles.includes('ADMIN_CHURCH') ||
            roles.includes('MINISTRY_LEADER');

        const member = await this.memberRep.findOne({ where: { id: memberId }, relations: ['church'] });
        if (!member) throw new NotFoundException('Miembro no encontrado');

        const whereClause: any = { church: { id: member.church.id } };
        if (type) whereClause.type = type;

        if (isAdminOrPastor) {
            // Admins and Pastors see all courses/activities in their church
            return this.courseRep.find({
                where: whereClause,
                relations: ['participants', 'participants.member', 'participants.member.person'],
                order: { startDate: 'DESC' }
            });
        } else {
            // Regular members only see what they are enrolled in OR if it's a public activity (simplified)
            // Implementation: If ACTIVITY, showing all active for now (as requested "Ver actividades activas").
            if (type === ProgramType.ACTIVITY) {
                return this.courseRep.find({
                    where: { ...whereClause, status: CourseStatus.ACTIVE },
                    relations: ['participants', 'participants.member', 'participants.member.person'],
                    order: { startDate: 'DESC' }
                });
            }

            // For Courses, strict enrollment check
            return this.courseRep.find({
                where: {
                    ...whereClause,
                    participants: { member: { id: memberId } }
                },
                relations: ['participants', 'participants.member', 'participants.member.person'],
                order: { startDate: 'DESC' }
            });
        }
    }

    async findOne(id: string) {
        const course = await this.courseRep.findOne({
            where: { id },
            relations: [
                'sessions',
                'sessions.event',
                'participants',
                'participants.member',
                'participants.member.person',
                'guests',
                'guests.followUpPerson',
                'guests.personInvited'
            ]
        });
        if (!course) throw new NotFoundException('Curso no encontrado');
        return course;
    }

    async update(id: string, updateDto: UpdateCourseDto) {
        const course = await this.findOne(id);

        const parseDate = (dateStr: string) => {
            if (!dateStr) return undefined;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        };

        // Explicitly map base fields
        if (updateDto.title) course.title = updateDto.title;
        if (updateDto.description !== undefined) course.description = updateDto.description;
        if (updateDto.category) course.category = updateDto.category;
        if (updateDto.capacity !== undefined) course.capacity = updateDto.capacity;
        if (updateDto.color) course.color = updateDto.color;
        if (updateDto.status) course.status = updateDto.status;

        if (updateDto.startDate) course.startDate = parseDate(updateDto.startDate);
        if (updateDto.endDate !== undefined) course.endDate = updateDto.endDate ? parseDate(updateDto.endDate) : null;

        return this.courseRep.save(course);
    }

    async delete(id: string) {
        const course = await this.findOne(id);

        // Cleanup calendar events from sessions
        if (course.sessions && course.sessions.length > 0) {
            const dateStr = new Date().toISOString().split('T')[0]; // Current date
            // Note: We should probably delete ALL future events or ALL events?
            // User said: "quitando todas sus relaciones, sus registros en el cronograma"
            // So we delete ALL associated events.

            for (const session of course.sessions) {
                // accessing session.event directly might require it to be loaded in findOne relation
                // In findOne I added 'sessions' but not 'sessions.event'.
                // I need to fetch sessions with events to delete them.
            }

            // Let's refetch sessions with events to be sure
            const sessions = await this.sessionRep.find({
                where: { course: { id } },
                relations: ['event']
            });

            for (const session of sessions) {
                if (session.event) {
                    await this.eventRep.delete(session.event.id);
                }
            }
        }

        return this.courseRep.delete(id);
    }

    // --- SESSIONS ---

    async createSession(courseId: string, dto: CreateSessionDto) {
        const course = await this.courseRep.findOne({
            where: { id: courseId },
            relations: ['church', 'participants', 'participants.member', 'participants.member.person']
        });
        if (!course) throw new NotFoundException('Curso no encontrado');

        // CREATE GLOBAL CALENDAR EVENT
        const startDateTime = new Date(`${dto.date}T${dto.startTime}:00`);
        const endDateTime = new Date(startDateTime.getTime() + (dto.estimatedDuration || 60) * 60000);

        // Get attendees (all current course participants)
        const attendees = course.participants.map(p => p.member.person);

        const event = this.eventRep.create({
            title: `${course.title} - ${dto.topic}`,
            description: dto.notes || `Sesión del curso: ${course.title}`,
            startDate: startDateTime,
            endDate: endDateTime,
            location: 'Iglesia', // Could be dynamic
            type: course.type === ProgramType.ACTIVITY ? CalendarEventType.ACTIVITY : CalendarEventType.COURSE,
            color: course.color,
            church: course.church,
            attendees: attendees
        });

        const savedEvent = await this.eventRep.save(event);

        const session = this.sessionRep.create({
            course,
            date: new Date(dto.date + 'T12:00:00'), // Force noon
            startTime: dto.startTime,
            estimatedDuration: dto.estimatedDuration || 60,
            topic: dto.topic,
            notes: dto.notes,
            event: savedEvent
        });

        return this.sessionRep.save(session);
    }

    async updateSession(sessionId: string, dto: Partial<CreateSessionDto>) {
        const session = await this.sessionRep.findOne({
            where: { id: sessionId },
            relations: ['event', 'course']
        });
        if (!session) throw new NotFoundException('Sesión no encontrada');

        // Update session fields
        if (dto.date) session.date = new Date(dto.date + 'T12:00:00');
        if (dto.startTime) session.startTime = dto.startTime;
        if (dto.topic) session.topic = dto.topic;
        if (dto.notes) session.notes = dto.notes;
        if (dto.estimatedDuration) session.estimatedDuration = dto.estimatedDuration;

        // Sync with event
        if (session.event) {
            if (dto.topic) session.event.title = `${session.course.title} - ${dto.topic}`;
            if (dto.notes) session.event.description = dto.notes;

            const finalDate = dto.date || session.date.toISOString().split('T')[0];
            const finalTime = dto.startTime || session.startTime;

            if (finalDate && finalTime) {
                const start = new Date(`${finalDate}T${finalTime}:00`);
                if (!isNaN(start.getTime())) {
                    session.event.startDate = start;
                    const duration = dto.estimatedDuration || session.estimatedDuration || 60;
                    session.event.endDate = new Date(start.getTime() + duration * 60000);
                }
            }
            await this.eventRep.save(session.event);
        }

        return this.sessionRep.save(session);
    }

    async getSessions(courseId: string) {
        return this.sessionRep.find({
            where: { course: { id: courseId } },
            order: { date: 'ASC', startTime: 'ASC' }
        });
    }

    // --- PARTICIPANTS ---

    async addParticipant(courseId: string, dto: AddParticipantDto) {
        const course = await this.courseRep.findOne({
            where: { id: courseId },
            relations: ['sessions', 'sessions.event']
        });
        if (!course) throw new NotFoundException('Curso no encontrado');

        // CHECK CAPACITY
        const participantCount = await this.participantRep.count({ where: { course: { id: courseId } } });
        const guestCount = await this.guestRep.count({ where: { course: { id: courseId } } });
        if (course.capacity > 0 && (participantCount + guestCount) >= course.capacity) {
            throw new BadRequestException(`Cupo alcanzado (${course.capacity} personas)`);
        }

        // Check if already exists
        const exists = await this.participantRep.findOne({
            where: { course: { id: courseId }, member: { id: dto.memberId } }
        });
        if (exists) throw new BadRequestException('El miembro ya está inscrito');

        const member = await this.memberRep.findOne({ where: { id: dto.memberId }, relations: ['person'] });
        if (!member) throw new NotFoundException('Miembro no encontrado');

        const participant = this.participantRep.create({
            course,
            member,
            role: dto.role || CourseRole.ATTENDEE
        });

        const savedParticipant = await this.participantRep.save(participant);

        // SYNC WITH CALENDAR
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (course.sessions) {
            const futureSessions = course.sessions.filter(s => new Date(s.date) >= today);
            for (const session of futureSessions) {
                if (session.event) {
                    const event = await this.eventRep.findOne({ where: { id: session.event.id }, relations: ['attendees'] });
                    if (event) {
                        if (!event.attendees) event.attendees = [];
                        if (!event.attendees.find(p => p.id === member.person.id)) {
                            event.attendees.push(member.person);
                            await this.eventRep.save(event);
                        }
                    }
                }
            }
        }

        return savedParticipant;
    }

    async removeParticipant(participantId: string) {
        const participant = await this.participantRep.findOne({
            where: { id: participantId },
            relations: ['member', 'member.person', 'course', 'course.sessions', 'course.sessions.event', 'course.sessions.event.attendees']
        });

        if (!participant) return { deleted: false };

        // SYNC CALENDAR: Remove from future events
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (participant.course && participant.course.sessions) {
            const futureSessions = participant.course.sessions.filter(s => new Date(s.date) >= today);
            const personId = participant.member.person.id;

            const updatePromises = futureSessions.map(async (session) => {
                if (session.event && session.event.attendees) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const originalCount = session.event.attendees.length;
                    session.event.attendees = session.event.attendees.filter(p => p.id !== personId);
                    if (session.event.attendees.length !== originalCount) {
                        return this.eventRep.save(session.event);
                    }
                }
            });
            await Promise.all(updatePromises);
        }

        return this.participantRep.remove(participant);
    }

    // --- GUESTS ---

    async addGuest(courseId: string, dto: AddGuestDto) {
        const course = await this.courseRep.findOne({
            where: { id: courseId },
            relations: ['church']
        });
        if (!course) throw new NotFoundException('Curso no encontrado');

        // CHECK CAPACITY
        const participantCount = await this.participantRep.count({ where: { course: { id: courseId } } });
        const guestCount = await this.guestRep.count({ where: { course: { id: courseId } } });
        if (course.capacity > 0 && (participantCount + guestCount) >= course.capacity) {
            throw new BadRequestException(`Cupo alcanzado (${course.capacity} personas)`);
        }

        // CHECK DUPLICATES
        if (dto.personInvitedId) {
            const exists = await this.guestRep.findOne({
                where: { course: { id: courseId }, personInvited: { id: dto.personInvitedId } }
            });
            if (exists) throw new BadRequestException('Esta persona ya está en la lista de invitados.');
        }

        if (dto.followUpPersonId) {
            const exists = await this.guestRep.findOne({
                where: { course: { id: courseId }, followUpPerson: { id: dto.followUpPersonId } }
            });
            if (exists) throw new BadRequestException('Esta persona ya está agregada como visitante.');
        }

        // 1. Get/Create PersonInvited (Funnel Base)
        let personInvited = null;
        let followUpPerson = null;

        if (dto.followUpPersonId) {
            followUpPerson = await this.followUpRep.findOne({
                where: { id: dto.followUpPersonId },
                relations: ['personInvited']
            });
        }

        if (dto.personInvitedId) {
            personInvited = await this.peopleFunnelService.findInvited(dto.personInvitedId);
        } else if (followUpPerson && followUpPerson.personInvited) {
            // Use the PI already linked to the Visitor
            personInvited = followUpPerson.personInvited;
        }

        if (!personInvited) {
            personInvited = await this.peopleFunnelService.findOrCreateInvited({
                firstName: dto.firstName || dto.fullName.split(' ')[0],
                lastName: dto.lastName || dto.fullName.split(' ').slice(1).join(' ') || '',
                email: dto.email,
                phone: dto.phone
            });

            // CRITICAL: If we created/found a PI for a Visitor (FollowUp) that didn't have one,
            // we MUST link them to ensure the PI doesn't show up in "Invited" search (which excludes those with FP).
            if (followUpPerson && !followUpPerson.personInvited) {
                followUpPerson.personInvited = personInvited;
                await this.followUpRep.save(followUpPerson);
            }
        }

        // 2. Logic to link with Global Contact (Legacy/Parallel)
        let contact = null;
        if (dto.email) {
            contact = await this.contactsService.findByEmail(dto.email, course.church.id);
        }

        if (!contact) {
            contact = await this.contactsService.create({
                firstName: dto.firstName || dto.fullName.split(' ')[0],
                lastName: dto.lastName || dto.fullName.split(' ').slice(1).join(' '),
                email: dto.email,
                phone: dto.phone,
                notes: dto.notes,
                source: `Course: ${course.title}`
            }, course.church.id);
        }

        const guest = this.guestRep.create({
            course,
            contact,
            fullName: dto.fullName,
            email: dto.email,
            phone: dto.phone,
            notes: dto.notes,
            followUpPerson: dto.followUpPersonId ? { id: dto.followUpPersonId } : null,
            personInvited: personInvited
        });

        return this.guestRep.save(guest);
    }

    async updateGuest(guestId: string, dto: Partial<AddGuestDto>) {
        const guest = await this.guestRep.findOne({ where: { id: guestId } });
        if (!guest) throw new NotFoundException('Invitado no encontrado');

        Object.assign(guest, dto);
        return this.guestRep.save(guest);
    }

    async removeGuest(guestId: string) {
        return this.guestRep.delete(guestId);
    }

    async promoteGuestToVisitor(guestId: string, promotedByMemberId: string): Promise<FollowUpPerson> {
        const guest = await this.guestRep.findOne({
            where: { id: guestId },
            relations: ['course', 'course.church', 'followUpPerson', 'personInvited']
        });

        if (!guest) throw new NotFoundException('Invitado no encontrado');
        if (guest.followUpPerson) throw new BadRequestException('Este invitado ya está en seguimiento.');

        // 1. Ensure PersonInvited exists (Migration on the fly)
        let personInvited = guest.personInvited;
        if (!personInvited) {
            personInvited = await this.peopleFunnelService.findOrCreateInvited({
                firstName: guest.fullName.split(' ')[0],
                lastName: guest.fullName.split(' ').slice(1).join(' ') || '',
                email: guest.email,
                phone: guest.phone
            });
            guest.personInvited = personInvited;
            await this.guestRep.save(guest);
        }

        // 2. Promote using Funnel Service
        const visitor = await this.peopleFunnelService.promoteToFollowUp(
            personInvited.id,
            guest.course.church.id,
            promotedByMemberId
        );

        // 3. Sync legacy column & Retroactive link for SAME PersonInvited
        // Update ALL guests linked to this PersonInvited
        await this.guestRep.update(
            { personInvited: { id: personInvited.id } },
            { followUpPerson: visitor }
        );

        // Also legacy by email/phone if they weren't linked to PersonInvited yet?
        // Ideally findOrCreateInvited would have caught them if we ran a full migration.
        // For now, satisfy strict requirement: "Retroactive Linking".
        // The update above satisfies it FOR guests that are linked.
        // What about guests NOT linked to PersonInvited yet but share email?
        // We should strictly rely on PersonInvited going forward.
        // But for transition, let's leave it as is (update via personInvited).
        // Since step 1 created PersonInvited for THIS guest.
        // Other guests might still have null personInvited.
        // Auto-migrate others?
        // Finding others by email/phone and linking them to PersonInvited + Visitor is good.

        const conditions = [];
        if (guest.email) conditions.push({ email: guest.email, personInvited: IsNull() });
        if (guest.phone) conditions.push({ phone: guest.phone, personInvited: IsNull() });

        if (conditions.length > 0) {
            const others = await this.guestRep.find({ where: conditions });
            for (const other of others) {
                other.personInvited = personInvited;
                other.followUpPerson = visitor;
            }
            if (others.length > 0) await this.guestRep.save(others);
        }

        return visitor;
    }

    async promoteGuestToMember(guestId: string): Promise<ChurchMember> {
        const guest = await this.guestRep.findOne({
            where: { id: guestId },
            relations: ['course', 'course.church', 'personInvited']
        });
        if (!guest) throw new NotFoundException('Invitado no encontrado');

        // 1. Ensure PersonInvited
        let personInvited = guest.personInvited;
        if (!personInvited) {
            personInvited = await this.peopleFunnelService.findOrCreateInvited({
                firstName: guest.fullName.split(' ')[0],
                lastName: guest.fullName.split(' ').slice(1).join(' ') || '',
                email: guest.email,
                phone: guest.phone
            });
            guest.personInvited = personInvited;
            await this.guestRep.save(guest);
        }

        // 2. Promote
        const member = await this.peopleFunnelService.promoteToMember(personInvited.id, guest.course.church.id);

        // 3. Update guest
        guest.convertedToMember = member;
        await this.guestRep.save(guest);

        return member;
    }

    // --- ATTENDANCE ---

    async registerAttendance(sessionId: string, items: { participantId?: string, guestId?: string, present: boolean, notes?: string }[]) {
        const session = await this.sessionRep.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException('Sesión no encontrada');

        // Usually batch save is better
        const promises = items.map(async (item) => {
            let record = null;
            if (item.participantId) {
                record = await this.attendanceRep.findOne({ where: { session: { id: sessionId }, participant: { id: item.participantId } } });
            } else if (item.guestId) {
                record = await this.attendanceRep.findOne({ where: { session: { id: sessionId }, guest: { id: item.guestId } } });
            }

            if (!record) {
                record = this.attendanceRep.create({
                    session,
                    participant: item.participantId ? { id: item.participantId } : null,
                    guest: item.guestId ? { id: item.guestId } : null
                });
            }

            record.present = item.present;
            record.notes = item.notes;
            return this.attendanceRep.save(record);
        });

        return Promise.all(promises);
    }

    async getAttendance(sessionId: string) {
        return this.attendanceRep.find({
            where: { session: { id: sessionId } },
            relations: ['participant', 'participant.member', 'participant.member.person', 'guest']
        });
    }

    async getStats(courseId: string) {
        const course = await this.findOne(courseId);

        // Count sessions
        const totalSessions = course.sessions.length;
        const pastSessions = course.sessions.filter(s => new Date(s.date) < new Date());

        let totalAttendancePercentage = 0;
        let sessionsWithAttendance = 0;

        // Ideally we do this with aggregation query, but for MVP loop is fine
        for (const session of pastSessions) {
            const attendanceCount = await this.attendanceRep.count({
                where: { session: { id: session.id }, present: true }
            });

            // Expected attendees (participants + guests)
            // Note: participants count might change over time, simplistic aproach uses current count
            const expected = (course.participants?.length || 0) + (course.guests?.length || 0);

            if (expected > 0) {
                totalAttendancePercentage += (attendanceCount / expected) * 100;
                sessionsWithAttendance++;
            }
        }

        const averageAttendance = sessionsWithAttendance > 0 ? Math.round(totalAttendancePercentage / sessionsWithAttendance) : 0;

        const participantsCount = course.participants?.length || 0;
        const totalGuests = course.guests?.length || 0;
        const visitorsCount = course.guests?.filter(g => g.followUpPerson).length || 0;
        const unlinkedGuestsCount = totalGuests - visitorsCount;

        return {
            totalSessions,
            pastSessions: pastSessions.length,
            averageAttendance: `${averageAttendance}%`,
            studentsCount: participantsCount + totalGuests,
            // New metrics
            visitorsCount,
            newGuestsCount: unlinkedGuestsCount,
            membersCount: participantsCount
        };
    }

    async joinCourse(courseId: string, memberIds: string[], requestingMemberId: string) {
        const course = await this.findOne(courseId);
        if (!course) throw new NotFoundException('Course/Activity not found');

        // VALIDATION: requestingMemberId must be able to add memberIds
        // If memberIds contains ONLY requestingMemberId -> OK
        const isSelfOnly = memberIds.length === 1 && memberIds[0] === requestingMemberId;

        if (!isSelfOnly) {
            // Check Family
            const family = await this.familiesService.findByMember(requestingMemberId);
            if (!family) throw new ForbiddenException('No tienes familia registrada para inscribir a otros.');

            // Verify all target members are in the family
            const familyMemberIds = family.members.map(fm => fm.member.id);
            const allInFamily = memberIds.every(id => familyMemberIds.includes(id));

            if (!allInFamily) throw new ForbiddenException('Solo puedes inscribir a miembros de tu familia.');
        }

        const results = [];

        // CHECK CAPACITY
        let currentCount = 0;
        if (course.capacity > 0) {
            const pCount = await this.participantRep.count({ where: { course: { id: courseId } } });
            const gCount = await this.guestRep.count({ where: { course: { id: courseId } } });
            currentCount = pCount + gCount;
        }
        for (const memberId of memberIds) {
            try {
                // Check if already participant
                const existing = await this.participantRep.findOne({
                    where: { course: { id: courseId }, member: { id: memberId } }
                });

                if (existing) {
                    results.push({ memberId, status: 'already_joined' });
                    continue;
                }

                // Check Capacity Limit
                if (course.capacity > 0 && currentCount >= course.capacity) {
                    results.push({ memberId, status: 'error', error: 'Cupo alcanzado' });
                    continue;
                }

                // Check basic capacity if needed?
                // Reuse logic from addParticipant? but addParticipant has manual DTO role.
                // Here we default to STUDENT/ATTENDEE.

                // Fetch member to link correctly
                const member = await this.memberRep.findOne({ where: { id: memberId } });
                if (!member) {
                    results.push({ memberId, status: 'error', error: 'Member not found' });
                    continue;
                }

                const participant = this.participantRep.create({
                    course,
                    member,
                    role: CourseRole.ATTENDEE,
                    enrolledAt: new Date()
                });

                await this.participantRep.save(participant);

                if (course.capacity > 0) currentCount++;

                // Global Calendar Sync (Simulate addParticipant logic)
                // SYNC WITH CALENDAR
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (course.sessions) {
                    const futureSessions = course.sessions.filter(s => new Date(s.date) >= today);
                    for (const session of futureSessions) {
                        if (session.event) {
                            const event = await this.eventRep.findOne({ where: { id: session.event.id }, relations: ['attendees'] });
                            if (event) {
                                if (!event.attendees) event.attendees = [];
                                // Need to load person relation for member? yes, findOne above didn't load person
                                // Let's simplify: fetch person using member
                                // Or better, load member with person above.
                                const fullMember = await this.memberRep.findOne({ where: { id: memberId }, relations: ['person'] });
                                if (fullMember && fullMember.person) {
                                    if (!event.attendees.find(p => p.id === fullMember.person.id)) {
                                        event.attendees.push(fullMember.person);
                                        await this.eventRep.save(event);
                                    }
                                }
                            }
                        }
                    }
                }

                results.push({ memberId, status: 'joined' });
            } catch (error) {
                console.error(`Failed to join member ${memberId}`, error);
                results.push({ memberId, status: 'error', error: error.message });
            }
        }
        return results;
    }

    async leaveCourse(courseId: string, memberId: string) {
        const participant = await this.participantRep.findOne({
            where: { course: { id: courseId }, member: { id: memberId } }
        });

        if (!participant) {
            throw new NotFoundException('No estás inscrito en esta actividad');
        }

        return this.removeParticipant(participant.id);
    }

    async searchInvited(query: string, churchId: string) {
        // if (!query) return []; // Allow empty for listing
        const q = query ? query.toLowerCase() : '';

        // Use repo manually or inject?
        // Reuse peopleFunnelService to keep logic clean?
        // Service doesn't have search. I'll access repo directly via peopleFunnelService or inject it?
        // I injected `PersonInvited` via TypeOrmModule but did NOT inject the repo in constructor.
        // PeopleFunnelService has the repo. I'll add search to PeopleFunnelService.
        return this.peopleFunnelService.search(query);
    }
}
