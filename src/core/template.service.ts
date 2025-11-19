import { AppDataSource } from '../config/database.config';
import { Template } from '../database/entities/template.entity';
import { CreateTemplateDTO, UpdateTemplateDTO, TemplateResponseDTO } from '../types/template.types';
import { Repository } from 'typeorm';

export class TemplateService {
  private repository: Repository<Template>;

  constructor() {
    this.repository = AppDataSource.getRepository(Template);
  }

  async create(dto: CreateTemplateDTO): Promise<TemplateResponseDTO> {
    const existing = await this.repository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new Error(`Template with name "${dto.name}" already exists`);
    }

    const template = this.repository.create(dto);
    const saved = await this.repository.save(template);

    return this.toResponseDTO(saved);
  }

  async findAll(): Promise<TemplateResponseDTO[]> {
    const templates = await this.repository.find({
      order: { createdAt: 'DESC' },
    });

    return templates.map((t) => this.toResponseDTO(t));
  }

  async findById(id: string): Promise<TemplateResponseDTO | null> {
    const template = await this.repository.findOne({
      where: { id },
    });

    return template ? this.toResponseDTO(template) : null;
  }

  async findByName(name: string): Promise<TemplateResponseDTO | null> {
    const template = await this.repository.findOne({
      where: { name },
    });

    return template ? this.toResponseDTO(template) : null;
  }

  async update(id: string, dto: UpdateTemplateDTO): Promise<TemplateResponseDTO> {
    const template = await this.repository.findOne({ where: { id } });

    if (!template) {
      throw new Error(`Template with id "${id}" not found`);
    }

    if (dto.name && dto.name !== template.name) {
      const existing = await this.repository.findOne({
        where: { name: dto.name },
      });

      if (existing) {
        throw new Error(`Template with name "${dto.name}" already exists`);
      }
    }

    Object.assign(template, dto);
    const updated = await this.repository.save(template);

    return this.toResponseDTO(updated);
  }

  async delete(id: string): Promise<void> {
    const result = await this.repository.delete(id);

    if (result.affected === 0) {
      throw new Error(`Template with id "${id}" not found`);
    }
  }

  private toResponseDTO(template: Template): TemplateResponseDTO {
    return {
      id: template.id,
      name: template.name,
      channel: template.channel,
      subject: template.subject,
      body: template.body,
      variables: template.variables,
      metadata: template.metadata,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}