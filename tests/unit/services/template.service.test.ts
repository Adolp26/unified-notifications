import { TemplateService } from '../../../src/core/template.service';
import { AppDataSource } from '../../../src/config/database.config';
import { Template } from '../../../src/database/entities/template.entity';
import { CreateTemplateDTO } from '../../../src/types/template.types';

jest.mock('../../../src/config/database.config', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('TemplateService', () => {
  let service: TemplateService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    service = new TemplateService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a template successfully', async () => {
      const dto: CreateTemplateDTO = {
        name: 'welcome_email',
        channel: 'email',
        subject: 'Welcome {{name}}',
        body: '<h1>Hello {{name}}</h1>',
        variables: ['name'],
      };

      const mockTemplate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockTemplate);
      mockRepository.save.mockResolvedValue(mockTemplate);

      const result = await service.create(dto);

      expect(result).toEqual(mockTemplate);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTemplate);
    });

    it('should throw error if template name already exists', async () => {
      const dto: CreateTemplateDTO = {
        name: 'welcome_email',
        channel: 'email',
        body: 'Hello',
      };

      mockRepository.findOne.mockResolvedValue({ id: '123', name: 'welcome_email' });

      await expect(service.create(dto)).rejects.toThrow(
        'Template with name "welcome_email" already exists'
      );
    });
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const mockTemplates = [
        {
          id: '1',
          name: 'template1',
          channel: 'email',
          body: 'Body 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'template2',
          channel: 'sms',
          body: 'Body 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockTemplates);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('template1');
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no templates', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return template if found', async () => {
      const mockTemplate = {
        id: '123',
        name: 'test',
        channel: 'email',
        body: 'Body',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findById('123');

      expect(result).toEqual(mockTemplate);
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const existingTemplate = {
        id: '123',
        name: 'old_name',
        channel: 'email',
        body: 'Old body',
      };

      const updateDto = {
        name: 'new_name',
        body: 'New body',
      };

      mockRepository.findOne.mockResolvedValueOnce(existingTemplate);
      mockRepository.findOne.mockResolvedValueOnce(null); 
      mockRepository.save.mockResolvedValue({ ...existingTemplate, ...updateDto });

      const result = await service.update('123', updateDto);

      expect(result.name).toBe('new_name');
      expect(result.body).toBe('New body');
    });

    it('should throw error if template not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('999', { body: 'New' })).rejects.toThrow(
        'Template with id "999" not found'
      );
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.delete('123')).resolves.not.toThrow();
      expect(mockRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw error if template not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete('999')).rejects.toThrow(
        'Template with id "999" not found'
      );
    });
  });
});