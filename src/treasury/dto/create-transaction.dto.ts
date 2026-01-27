import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '../../common/enums';

export class CreateTransactionDto {
    @ApiProperty({ enum: TransactionType })
    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType;

    @ApiProperty({ example: 1000 })
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @ApiProperty({ example: 'Ofrenda dominical' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({ example: 'Alquiler' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiProperty({ example: '2023-10-27T10:00:00Z' })
    @IsString()
    @IsOptional()
    date?: string;
}
