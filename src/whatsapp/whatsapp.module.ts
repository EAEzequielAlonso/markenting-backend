import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { Lead } from './entities/lead.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [TypeOrmModule.forFeature([Lead]), ConfigModule],
    providers: [WhatsappService],
    controllers: [WhatsappController],
    exports: [WhatsappService],
})
export class WhatsappModule { }
