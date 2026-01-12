import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Lead, LeadStatus } from './entities/lead.entity';
import { AiService } from '../ai/ai.service';
import { PromptType } from '../ai/prompt-registry.service';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class WhatsappService {
    private readonly fbGraphUrl = 'https://graph.facebook.com/v19.0';

    constructor(
        private configService: ConfigService,
        private aiService: AiService,
        @InjectRepository(Lead)
        private leadRepository: Repository<Lead>,
    ) { }

    async handleWebhook(data: any) {
        // 1. Extraer mensaje y remitente
        const entry = data.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message) return { status: 'no message' };

        const from = message.from; // Número de teléfono del cliente
        const text = message.text?.body;
        const wabaId = value?.metadata?.phone_number_id;

        // 2. Buscar o crear Lead vinculado a la empresa (simplificado para MVP usando wabaId o similar)
        // En un sistema real buscaríamos la empresa por el phone_number_id de Meta
        let lead = await this.leadRepository.findOne({
            where: { phoneNumber: from },
            relations: ['company']
        });

        if (!lead) {
            lead = this.leadRepository.create({
                phoneNumber: from,
                conversationHistory: [],
                status: LeadStatus.COLD,
            });
            await this.leadRepository.save(lead);
        }

        // 3. Obtener respuesta del Agente Vendedor
        const context = lead.company ? `Negocio: ${lead.company.name}. Industria: ${lead.company.industry}. Lo que vende: ${lead.company.productsDescription}` : "Negocio Genérico";

        const aiResponse = await this.aiService.generateResponse(
            PromptType.SELLER,
            { context, message: text },
            lead.company?.id
        );

        // 4. Enviar respuesta por WhatsApp (Meta API)
        // Para esto necesitaríamos el token de la empresa.
        if (lead.company?.metaToken) {
            await this.sendMessage(lead.company.metaToken, wabaId, from, aiResponse);
        }

        // 5. Actualizar historial y clasificar lead
        lead.conversationHistory.push(
            { role: 'user', content: text, timestamp: new Date() },
            { role: 'assistant', content: aiResponse, timestamp: new Date() }
        );

        // Clasificación automática rápida (Placeholder para mejora posterior)
        if (aiResponse.toLowerCase().includes('precio') || aiResponse.toLowerCase().includes('comprar')) {
            lead.status = LeadStatus.INTERESTED;
        }

        await this.leadRepository.save(lead);

        return { status: 'success', response: aiResponse };
    }

    async sendMessage(token: string, phoneId: string, to: string, text: string) {
        try {
            await axios.post(`${this.fbGraphUrl}/${phoneId}/messages`, {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Error sending WhatsApp message:', error.response?.data || error.message);
        }
    }

    async getLeadsByCompany(companyId: string) {
        return this.leadRepository.find({
            where: { company: { id: companyId } },
            order: { updatedAt: 'DESC' }
        });
    }
}
