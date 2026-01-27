import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSmallGroupDto {
    @ApiProperty({ example: 'Jóvenes Adultos' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ example: 'Grupo de estudio bíblico para jóvenes' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'Tuesday' })
    @IsString()
    @IsNotEmpty()
    dayOfWeek: string;

    @ApiProperty({ example: '19:00' })
    @IsString()
    @IsNotEmpty()
    time: string;

    @ApiProperty({ example: 'uuid-leader' })
    @IsString()
    @IsOptional()
    leaderId?: string;
}
