import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsDate, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscipleshipRole, DiscipleshipStatus, DiscipleshipNoteType, DiscipleshipTaskStatus } from '../../common/enums';

export class CreateDiscipleshipDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    objective?: string;

    @IsString()
    @IsOptional()
    studyMaterial?: string;

    @IsArray()
    @IsNotEmpty()
    participants: { memberId: string, role: DiscipleshipRole }[];

    @IsString()
    @IsOptional() // If string date
    startDate?: string;
}

export class CreateMeetingDto {
    @IsString()
    @IsNotEmpty()
    date: string; // ISO

    @IsOptional()
    durationMinutes?: number;

    @IsString()
    @IsOptional()
    summary?: string;

    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    @IsEnum(['PRESENCIAL', 'VIRTUAL'])
    type?: 'PRESENCIAL' | 'VIRTUAL';

    @IsString()
    @IsOptional()
    color?: string;

    @IsOptional()
    initialNote?: {
        content: string;
        type?: DiscipleshipNoteType;
    };
}

export class CreateNoteDto {
    @IsEnum(DiscipleshipNoteType)
    type: DiscipleshipNoteType;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsUUID()
    @IsOptional()
    meetingId?: string;
}

export class CreateTaskDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsUUID()
    @IsNotEmpty()
    meetingId: string;

    @IsUUID()
    @IsOptional()
    assignedToId?: string; // Optional assignment

    @IsString()
    @IsOptional()
    dueDate?: string;
}

export class UpdateTaskDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    discipleResponse?: string;

    @IsString()
    @IsOptional()
    disciplerFeedback?: string;

    @IsEnum(DiscipleshipTaskStatus)
    @IsOptional()
    status?: DiscipleshipTaskStatus;
}
