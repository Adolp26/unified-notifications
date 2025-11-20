import { Request, Response } from 'express';
import { TemplateService } from '../../core/template.service';
import { CreateTemplateDTO, UpdateTemplateDTO } from '../../types/template.types';
import { TemplateEngineService } from '../../core/template.engine.service';

export class TemplateController {
  private service: TemplateService;

  constructor() {
    this.service = new TemplateService();
  }

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: CreateTemplateDTO = req.body;
      const template = await this.service.create(dto);

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.service.findAll();
      res.status(200).json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const template = await this.service.findById(id);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.status(200).json(template);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: UpdateTemplateDTO = req.body;
      const template = await this.service.update(id, dto);

      res.status(200).json(template);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.service.delete(id);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };


  preview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const context = req.body;

      const template = await this.service.findById(id);
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const engineService = new TemplateEngineService();
      const result = engineService.processTemplate(
        template.subject,
        template.body,
        context
      );

      res.status(200).json({
        original: {
          subject: template.subject,
          body: template.body,
        },
        processed: {
          subject: result.subject,
          body: result.body,
        },
        missingVariables: result.missingVariables,
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}