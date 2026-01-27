export enum SystemRole {
    ADMIN_APP = 'ADMIN_APP',
    USER = 'USER'
}

export enum PlanType {
    TRIAL = 'TRIAL',
    BASIC = 'BASIC',
    PRO = 'PRO',
    ELITE = 'ELITE',
}

export enum SubscriptionStatus {
    TRIAL = 'TRIAL',
    ACTIVE = 'ACTIVE',
    CANCELLED = 'CANCELLED',
}

// Deprecated: Use EcclesiasticalRole instead
// export enum ChurchRole {
//     ADMIN = 'ADMIN',
//     PASTOR = 'PASTOR',
//     LEADER = 'LEADER',
//     MEMBER = 'MEMBER',
// }

export enum MembershipStatus {
    PROSPECT = 'PROSPECT',
    MEMBER = 'MEMBER',
    CHILD = 'CHILD',
    DISCIPLINED = 'DISCIPLINED',
    EXCOMMUNICATED = 'EXCOMMUNICATED',
    INACTIVE = 'INACTIVE'
}

export enum EcclesiasticalRole {
    PASTOR = 'PASTOR',
    BISHOP = 'BISHOP',
    ELDER = 'ELDER',
    DEACON = 'DEACON',
    LEADER = 'LEADER',
    NONE = 'NONE'
}

export enum MinistryRole {
    LEADER = 'MINISTRY_LEADER',
    COORDINATOR = 'MINISTRY_COORDINATOR',
    TEAM_MEMBER = 'MINISTRY_TEAM_MEMBER'
}

export enum SmallGroupRole {
    MODERATOR = 'MODERATOR',
    COLLABORATOR = 'COLLABORATOR',
    PARTICIPANT = 'PARTICIPANT'
}

export enum FamilyRole {
    FATHER = 'FATHER',
    MOTHER = 'MOTHER',
    CHILD = 'CHILD'
}

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
}

export enum CounselingStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

export enum FollowUpStatus {
    NEW = 'NEW',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
    HIDDEN = 'HIDDEN',
}

export enum WeekDay {
    MONDAY = 'MONDAY',
    TUESDAY = 'TUESDAY',
    WEDNESDAY = 'WEDNESDAY',
    THURSDAY = 'THURSDAY',
    FRIDAY = 'FRIDAY',
    SATURDAY = 'SATURDAY',
    SUNDAY = 'SUNDAY',
}

export enum AccountType {
    ASSET = 'asset',
    LIABILITY = 'liability',
    INCOME = 'income',
    EXPENSE = 'expense',
    EQUITY = 'equity'
}

export enum MaritalStatus {
    SINGLE = 'SINGLE',
    MARRIED = 'MARRIED',
    DIVORCED = 'DIVORCED',
    WIDOWED = 'WIDOWED'
}

export enum Sex {
    MALE = 'MALE',
    FEMALE = 'FEMALE'
}

export enum CareProcessType {
    INFORMAL = 'INFORMAL',
    FORMAL = 'FORMAL',
}

export enum CareProcessStatus {
    DRAFT = 'DRAFT',
    PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE',
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    CLOSED = 'CLOSED',
}

export enum CareParticipantRole {
    COUNSELOR = 'COUNSELOR',
    COUNSELEE = 'COUNSELEE',
    SUPERVISOR = 'SUPERVISOR',
}

export enum CareNoteVisibility {
    PERSONAL = 'PERSONAL',
    SHARED = 'SHARED',
    SUPERVISION = 'SUPERVISION',
}

export enum CareSessionStatus {
    SCHEDULED = 'SCHEDULED',
    COMPLETED = 'COMPLETED',
    CANCELED = 'CANCELED',
}

export enum CareTaskStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REVIEWED = 'REVIEWED',
}

export enum LoanStatus {
    ACTIVE = 'ACTIVE',
    OVERDUE = 'OVERDUE',
    RETURNED = 'RETURNED',
}

export enum PrayerRequestStatus {
    WAITING = 'WAITING',
    ANSWERED = 'ANSWERED',
    HIDDEN = 'HIDDEN',
    DELETED = 'DELETED',
}

export enum PrayerRequestVisibility {
    PRIVATE = 'PRIVATE',
    LEADERS_ONLY = 'LEADERS_ONLY',
    PUBLIC = 'PUBLIC',
}

export enum MinistryEventType {
    MEETING = 'MEETING',
    REHEARSAL = 'REHEARSAL',
    SERVICE = 'SERVICE',
    ACTIVITY = 'ACTIVITY',
    OTHER = 'OTHER',
}

export enum CalendarEventType {
    PERSONAL = 'PERSONAL',
    MINISTRY = 'MINISTRY',
    CHURCH = 'CHURCH',
    SMALL_GROUP = 'SMALL_GROUP',
    COUNSELING = 'COUNSELING', // Helper for mapping
    DISCIPLESHIP = 'DISCIPLESHIP',
    COURSE = 'COURSE',
    ACTIVITY = 'ACTIVITY',
    OTHER = 'OTHER',
}

export enum DiscipleshipStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
}

export enum DiscipleshipRole {
    DISCIPLER = 'DISCIPLER',
    DISCIPLE = 'DISCIPLE',
    SUPERVISOR = 'SUPERVISOR',
}

export enum DiscipleshipNoteType {
    PRIVATE = 'PRIVATE',
    SHARED = 'SHARED',
    SUPERVISION = 'SUPERVISION',
}

export enum DiscipleshipTaskStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
}

export enum CourseStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
}

export enum CourseRole {
    INSTRUCTOR = 'INSTRUCTOR',
    ATTENDEE = 'ATTENDEE',
}

export enum ProgramType {
    COURSE = 'COURSE',
    ACTIVITY = 'ACTIVITY',
}
