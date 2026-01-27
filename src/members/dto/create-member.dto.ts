import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsUUID } from 'class-validator';
import { MembershipStatus, EcclesiasticalRole } from '../../common/enums';

export class CreateMemberDto {
    @ApiProperty({ example: 'john@example.com', required: false })
    @IsString()
    @IsOptional()
    email?: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({ example: 'John Doe', required: false })
    @IsString()
    @IsOptional()
    fullName?: string;

    @ApiProperty({ enum: MembershipStatus, required: false, default: MembershipStatus.MEMBER })
    @IsEnum(MembershipStatus)
    @IsOptional()
    status?: MembershipStatus;

    @ApiProperty({ enum: EcclesiasticalRole, required: false, default: EcclesiasticalRole.NONE })
    //@IsEnum(EcclesiasticalRole) // Disabled if validation is strict about the enum type
    @IsOptional()
    ecclesiasticalRole?: EcclesiasticalRole;

    @ApiProperty({ example: '12345678', required: false })
    @IsString()
    @IsOptional()
    documentId?: string;

    @ApiProperty({ example: '+54 11 1234 5678', required: false })
    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @ApiProperty({ example: '1990-01-01', required: false })
    @IsString()
    @IsOptional()
    birthDate?: string;
}
