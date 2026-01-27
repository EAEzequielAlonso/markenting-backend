import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { WorshipService } from './entities/worship-service.entity';
import { ServiceSection } from './entities/service-section.entity';
import { ServiceTemplate } from './entities/service-template.entity';
import { ServiceTemplateSection } from './entities/service-template-section.entity';
import { MinistryRoleAssignment } from '../ministries/entities/ministry-role-assignment.entity';
import { ServiceStatus } from './entities/worship-service.entity';

@Injectable()
export class WorshipServiceService {
    constructor(
        @InjectRepository(WorshipService) private serviceRepo: Repository<WorshipService>,
        @InjectRepository(ServiceSection) private sectionRepo: Repository<ServiceSection>,
        @InjectRepository(ServiceTemplate) private templateRepo: Repository<ServiceTemplate>,
        @InjectRepository(ServiceTemplateSection) private templateSectionRepo: Repository<ServiceTemplateSection>,
        @InjectRepository(MinistryRoleAssignment) private assignmentRepo: Repository<MinistryRoleAssignment>,
    ) { }

    // --- TEMPLATES ---

    async findAllTemplates(churchId: string) {
        return this.templateRepo.find({
            where: { church: { id: churchId } },
            relations: ['sections', 'sections.requiredRoles']
        });
    }

    async createTemplate(churchId: string, data: any) {
        // Simple create logic, handling sections creation if passed or separate endpoint
        const template = this.templateRepo.create({
            ...data,
            church: { id: churchId }
        });
        return this.templateRepo.save(template);
    }

    async findTemplate(id: string) {
        return this.templateRepo.findOne({
            where: { id },
            relations: ['sections', 'sections.requiredRoles'],
            order: { sections: { order: 'ASC' } }
        });
    }

    async deleteTemplate(id: string) {
        const template = await this.templateRepo.findOne({ where: { id } });
        if (!template) throw new NotFoundException('Plantilla no encontrada');
        return this.templateRepo.remove(template);
    }

    async addTemplateSection(templateId: string, data: any) {
        const template = await this.templateRepo.findOne({ where: { id: templateId } });
        if (!template) throw new NotFoundException('Plantilla no encontrada');

        const section = this.templateSectionRepo.create({
            template,
            title: data.title,
            defaultDuration: data.type === 'GLOBAL' ? 0 : (data.defaultDuration || 15),
            order: data.order || 0,
            type: data.type,
            ministry: data.ministryId ? { id: data.ministryId } : undefined
        });

        if (data.requiredRoleIds && Array.isArray(data.requiredRoleIds)) {
            // Assuming we can pass IDs and TypeORM handles it if we map to objects
            // Or better, fetch them. For simplicity, let's trust IDs or use partial objects
            section.requiredRoles = data.requiredRoleIds.map((id: string) => ({ id }));
        }

        return this.templateSectionRepo.save(section);
    }

    async deleteTemplateSection(templateId: string, sectionId: string) {
        // Ensure it belongs to template?
        const section = await this.templateSectionRepo.findOne({ where: { id: sectionId, template: { id: templateId } } });
        if (!section) throw new NotFoundException('Sección no encontrada');
        return this.templateSectionRepo.remove(section);
    }

    // --- SERVICES & HYDRATION ---

    async findAllServices(churchId: string) {
        return this.serviceRepo.find({
            where: { church: { id: churchId } },
            order: { date: 'DESC' }
        });
    }

    async findUpcomingServices(churchId: string) {
        return this.serviceRepo.find({
            where: {
                church: { id: churchId },
                status: ServiceStatus.CONFIRMED,
                date: MoreThan(new Date())
            },
            order: { date: 'ASC' },
            take: 3
        });
    }

    async findOneService(id: string) {
        const service = await this.serviceRepo.findOne({
            where: { id },
            relations: [
                'sections',
                'sections.requiredRoles',
                'sections.requiredRoles.ministry',
                'sections.ministry', // Include Section Ministry
                'template'
            ],
            order: {
                sections: { order: 'ASC' }
            }
        });

        if (!service) throw new NotFoundException('Culto no encontrado');

        // HYDRATION: Fetch assignments for this date
        const dateStr = service.date instanceof Date
            ? service.date.toISOString().split('T')[0]
            : new Date(service.date).toISOString().split('T')[0];

        // Fetch all assignments for this date from Ministries
        const assignments = await this.assignmentRepo.find({
            where: { date: dateStr },
            relations: ['role', 'person', 'ministry']
        });

        // Attach assignments to sections dynamically
        // We return a "rich" object, not just the entity
        const richSections = service.sections.map(section => {
            const filledRoles = section.requiredRoles.map(role => {
                // 1. Check Override
                const overridePersonId = section.overrides ? section.overrides[role.id] : null;
                let assignedPerson = null;
                let status = 'UNASSIGNED'; // UNASSIGNED, ASSIGNED, OVERRIDE
                let metadata = null;

                if (overridePersonId) {
                    status = 'OVERRIDE';
                    // We would fetch the Person details for the override ID here if we want full details
                    // For now, let's assume frontend fetches or we add a quick lookup
                    assignedPerson = { id: overridePersonId, name: 'Override Person' }; // TODO: Fetch info
                } else {
                    // 2. Check Ministry Assignment
                    const assignment = assignments.find(a => a.role.id === role.id);
                    if (assignment) {
                        status = 'ASSIGNED';
                        assignedPerson = assignment.person;
                        metadata = assignment.metadata; // Hydrate metadata
                    }
                }

                return {
                    role,
                    status,
                    assignedPerson,
                    metadata
                };
            });

            return {
                ...section,
                filledRoles
            };
        });

        return {
            ...service,
            sections: richSections
        };
    }

    async deleteService(id: string) {
        const service = await this.serviceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException('Culto no encontrado');
        return this.serviceRepo.remove(service);
    }

    async createServiceFromTemplate(churchId: string, templateId: string, date: string) {
        const template = await this.templateRepo.findOne({
            where: { id: templateId },
            relations: ['sections', 'sections.requiredRoles', 'sections.ministry']
        });
        if (!template) throw new NotFoundException('Plantilla no encontrada');

        const service = this.serviceRepo.create({
            date: new Date(date),
            church: { id: churchId },
            status: ServiceStatus.DRAFT,
            template,
            topic: template.name
        });

        const savedService = await this.serviceRepo.save(service);

        // Copy Sections
        const sections = template.sections.map(ts => {
            return this.sectionRepo.create({
                service: savedService,
                title: ts.title,
                order: ts.order,
                duration: ts.type === 'GLOBAL' ? 0 : ts.defaultDuration,
                type: ts.type, // Copy TYPE (Fixes Global bug)
                ministry: ts.ministry, // Copy Ministry
                requiredRoles: ts.requiredRoles
            });
        });

        await this.sectionRepo.save(sections);
        return this.findOneService(savedService.id);
    }

    async updateSection(sectionId: string, data: any) {
        const section = await this.sectionRepo.findOne({ where: { id: sectionId } });
        if (!section) throw new NotFoundException('Sección no encontrada');
        Object.assign(section, data);
        return this.sectionRepo.save(section);
    }

    async confirmService(id: string) {
        const service = await this.serviceRepo.findOne({ where: { id } });
        if (!service) throw new NotFoundException('Culto no encontrado');

        service.status = ServiceStatus.CONFIRMED;
        return this.serviceRepo.save(service);
    }
}
