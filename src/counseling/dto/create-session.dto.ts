import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
    @ApiProperty({ example: 'uuid-counselee' })
    @IsString()
    @IsNotEmpty()
    counseleeId: string; // Member ID

    @ApiProperty({ example: '2023-10-28T15:00:00Z' })
    @IsString()
    @IsNotEmpty()
    date: string;

    @ApiProperty({ example: 'Matrimonial problems' })
    @IsString()
    @IsOptional()
    topic?: string;

    @ApiProperty({ example: 'uuid-coustelor' })
    @IsString()
    @IsOptional()
    counselorId?: string; // Member ID (Pastor/Leader)
}
