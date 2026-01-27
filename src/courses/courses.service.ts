import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course) private courseRep: Repository<Course>,
        @InjectRepository(CourseSession) private sessionRep: Repository<CourseSession>,
        @InjectRepository(CourseParticipant) private participantRep: Repository<CourseParticipant>,
        @InjectRepository(CourseGuest) private guestRep: Repository<CourseGuest>,
        @InjectRepository(SessionAttendance) private attendanceRep: Repository<SessionAttendance>,
        @InjectRepository(ChurchMember) private memberRep: Repository<ChurchMember>,
        @InjectRepository(CalendarEvent) private eventRep: Repository<CalendarEvent>,
        @InjectRepository(Church) private churchRep: Repository<Church>,
        private contactsService: ContactsService
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
        const isAdminOrPastor = roles.includes('ADMIN_APP') || roles.includes('PASTOR');

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
                'participants',
                'participants.member',
                'participants.member.person',
                'guests'
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

        // Logic to link with Global Contact
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
            notes: dto.notes
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

        return {
            totalSessions,
            pastSessions: pastSessions.length,
            averageAttendance: `${averageAttendance}%`,
            studentsCount: (course.participants?.length || 0) + (course.guests?.length || 0)
        };
    }
}
