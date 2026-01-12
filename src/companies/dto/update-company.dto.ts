import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { IndustryType } from '../entities/company.entity';

export class UpdateCompanyDto {
    @IsEnum(IndustryType)
    @IsOptional()
    industry?: IndustryType;

    @IsString()
    @IsOptional()
    goal?: string;

    @IsString()
    @IsOptional()
    metaToken?: string;

    @IsString()
    @IsOptional()
    adAccountId?: string;

    @IsString()
    @IsOptional()
    fbPageId?: string;

    @IsString()
    @IsOptional()
    fbPageAccessToken?: string;

    @IsString()
    @IsOptional()
    linkedinToken?: string;

    @IsString()
    @IsOptional()
    twitterToken?: string;

    @IsString()
    @IsOptional()
    tiktokToken?: string;

    @IsString()
    @IsOptional()
    googleAdsId?: string;

    @IsString()
    @IsOptional()
    productsDescription?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsNumber()
    @IsOptional()
    monthlyBudget?: number;

    @IsBoolean()
    @IsOptional()
    onboardingCompleted?: boolean;

    @IsString()
    @IsOptional()
    aiContext?: string;

    @IsString()
    @IsOptional()
    aiObjective?: string;

    @IsString()
    @IsOptional()
    aiConstraints?: string;

    @IsString()
    @IsOptional()
    aiTone?: string;
}
