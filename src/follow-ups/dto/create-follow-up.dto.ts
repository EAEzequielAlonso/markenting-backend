import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FollowUpStatus } from '../../common/enums';

export class CreateFollowUpDto {
    @ApiProperty({ example: 'Juan Invitado' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: '555-1234' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ example: 'juan@test.com' })
    @IsString()
    @IsOptional()
    email?: string;

    @ApiProperty({ enum: FollowUpStatus, default: FollowUpStatus.NEW })
    @IsEnum(FollowUpStatus)
    @IsOptional()
    status?: FollowUpStatus;

    @ApiProperty({ example: 'Interesado en bautismo' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiProperty({ example: 'uuid-member-assigned' })
    @IsString()
    @IsOptional()
    assignedToId?: string;
}
