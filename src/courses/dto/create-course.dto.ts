import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsDate, IsUUID, IsNumber, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseStatus, CourseRole, ProgramType } from '../../common/enums';

export class CreateCourseDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsEnum(ProgramType)
    @IsOptional()
    type?: ProgramType;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsNotEmpty()
    startDate: string; // ISO Date String

    @IsString()
    @IsOptional()
    endDate?: string; // ISO Date String

    @IsNumber()
    @IsOptional()
    capacity?: number;

    @IsString()
    @IsOptional()
    color?: string;
}

export class UpdateCourseDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    startDate?: string;

    @IsString()
    @IsOptional()
    endDate?: string;

    @IsNumber()
    @IsOptional()
    capacity?: number;

    @IsString()
    @IsOptional()
    color?: string;

    @IsEnum(CourseStatus)
    @IsOptional()
    status?: CourseStatus;

    @IsEnum(ProgramType)
    @IsOptional()
    type?: ProgramType;
}

export class CreateSessionDto {
    @IsString()
    @IsNotEmpty()
    date: string; // ISO Date "yyyy-MM-dd"

    @IsString()
    @IsNotEmpty()
    startTime: string; // "HH:mm"

    @IsNumber()
    @IsOptional()
    estimatedDuration?: number;

    @IsString()
    @IsNotEmpty()
    topic: string;

    @IsString()
    @IsOptional()
    notes?: string;
}

export class AddParticipantDto {
    @IsUUID()
    @IsNotEmpty()
    memberId: string;

    @IsEnum(CourseRole)
    @IsOptional()
    role?: CourseRole;
}

export class AddGuestDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsUUID()
    followUpPersonId?: string;

    @IsOptional()
    @IsUUID()
    personInvitedId?: string;
}
