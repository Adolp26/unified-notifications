import { TemplateEngineService } from '../../../src/core/template.engine.service';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(() => {
    service = new TemplateEngineService();
  });

  describe('process', () => {
    it('should replace simple variables', () => {
      const template = 'Hello {{name}}!';
      const context = { name: 'João' };

      const result = service.process(template, context);

      expect(result).toBe('Hello João!');
    });

    it('should replace multiple variables', () => {
      const template = 'Hello {{name}}, your code is {{code}}';
      const context = { name: 'Maria', code: 'ABC123' };

      const result = service.process(template, context);

      expect(result).toBe('Hello Maria, your code is ABC123');
    });

    it('should handle nested objects', () => {
      const template = 'User: {{user.name}}, Email: {{user.email}}';
      const context = {
        user: {
          name: 'João',
          email: 'joao@example.com',
        },
      };

      const result = service.process(template, context);

      expect(result).toBe('User: João, Email: joao@example.com');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}!';
      const context = {};

      const result = service.process(template, context);

      expect(result).toBe('Hello !');
    });

    it('should throw error for invalid template syntax', () => {
      const template = 'Hello {{name}'; // Missing closing braces
      const context = { name: 'João' };

      expect(() => service.process(template, context)).toThrow('Template processing failed');
    });
  });

  describe('processTemplate', () => {
    it('should process both subject and body', () => {
      const subject = 'Welcome {{name}}';
      const body = 'Hello {{name}}, your email is {{email}}';
      const context = { name: 'João', email: 'joao@test.com' };

      const result = service.processTemplate(subject, body, context);

      expect(result.subject).toBe('Welcome João');
      expect(result.body).toBe('Hello João, your email is joao@test.com');
      expect(result.missingVariables).toEqual([]);
    });

    it('should detect missing variables', () => {
      const body = 'Hello {{name}}, your code is {{code}}';
      const context = { name: 'João' }; // Missing 'code'

      const result = service.processTemplate(undefined, body, context);

      expect(result.missingVariables).toContain('code');
      expect(result.missingVariables.length).toBe(1);
    });

    it('should work without subject', () => {
      const body = 'Hello {{name}}';
      const context = { name: 'João' };

      const result = service.processTemplate(undefined, body, context);

      expect(result.subject).toBeUndefined();
      expect(result.body).toBe('Hello João');
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const template = 'Hello {{name}}, your code is {{code}} and email is {{email}}';

      const variables = service.extractVariables(template);

      expect(variables).toEqual(expect.arrayContaining(['name', 'code', 'email']));
      expect(variables.length).toBe(3);
    });

    it('should handle duplicate variables', () => {
      const template = 'Hello {{name}}, goodbye {{name}}';

      const variables = service.extractVariables(template);

      expect(variables).toEqual(['name']);
      expect(variables.length).toBe(1);
    });

    it('should return empty array for template without variables', () => {
      const template = 'Hello World!';

      const variables = service.extractVariables(template);

      expect(variables).toEqual([]);
    });

    it('should handle nested variables', () => {
      const template = 'User: {{user.name}}, Age: {{user.age}}';

      const variables = service.extractVariables(template);

      // Nota: extrai como "user.name" e "user.age"
      expect(variables.length).toBeGreaterThan(0);
    });
  });

  describe('getMissingVariables', () => {
    it('should return empty array when all variables are provided', () => {
      const body = 'Hello {{name}}';
      const context = { name: 'João' };

      const missing = service.getMissingVariables(undefined, body, context);

      expect(missing).toEqual([]);
    });

    it('should return missing variables', () => {
      const body = 'Hello {{name}}, your code is {{code}}';
      const context = { name: 'João' };

      const missing = service.getMissingVariables(undefined, body, context);

      expect(missing).toContain('code');
    });

    it('should check both subject and body', () => {
      const subject = 'Welcome {{name}}';
      const body = 'Your code is {{code}}';
      const context = {};

      const missing = service.getMissingVariables(subject, body, context);

      expect(missing).toEqual(expect.arrayContaining(['name', 'code']));
    });

    it('should consider empty string as missing', () => {
      const body = 'Hello {{name}}';
      const context = { name: '' };

      const missing = service.getMissingVariables(undefined, body, context);

      expect(missing).toContain('name');
    });

    it('should use provided required variables if given', () => {
      const body = 'Hello {{name}}';
      const context = {};
      const requiredVariables = ['name', 'email']; // email não está no template

      const missing = service.getMissingVariables(
        undefined,
        body,
        context,
        requiredVariables
      );

      expect(missing).toEqual(expect.arrayContaining(['name', 'email']));
    });
  });

  describe('validateTemplate', () => {
    it('should return valid for correct template', () => {
      const template = 'Hello {{name}}!';

      const result = service.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for malformed template', () => {
      const template = 'Hello {{name}'; // Missing closing braces

      const result = service.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate complex templates', () => {
      const template = `
        {{#if user}}
          Hello {{user.name}}
        {{else}}
          Hello Guest
        {{/if}}
      `;

      const result = service.validateTemplate(template);

      expect(result.valid).toBe(true);
    });
  });

  describe('Handlebars helpers', () => {
    it('should use upper helper', () => {
      const template = 'Hello {{upper name}}!';
      const context = { name: 'joão' };

      const result = service.process(template, context);

      expect(result).toBe('Hello JOÃO!');
    });

    it('should use lower helper', () => {
      const template = 'Hello {{lower name}}!';
      const context = { name: 'MARIA' };

      const result = service.process(template, context);

      expect(result).toBe('Hello maria!');
    });

    it('should use formatDate helper', () => {
      const template = 'Date: {{formatDate date}}';
      const context = { date: new Date('2025-01-15') };

      const result = service.process(template, context);

      expect(result).toContain('15/01/2025');
    });

    it('should use truncate helper', () => {
      const template = '{{truncate text 10}}';
      const context = { text: 'This is a very long text' };

      const result = service.process(template, context);

      expect(result).toBe('This is a ...');
    });

    it('should use default helper', () => {
      const template = 'Name: {{default name "Guest"}}';
      const context = {};

      const result = service.process(template, context);

      expect(result).toBe('Name: Guest');
    });
  });

  describe('Advanced Handlebars features', () => {
    it('should handle conditionals', () => {
      const template = `
        {{#if premium}}
          Premium User
        {{else}}
          Free User
        {{/if}}
      `;

      const context1 = { premium: true };
      const context2 = { premium: false };

      const result1 = service.process(template, context1);
      const result2 = service.process(template, context2);

      expect(result1).toContain('Premium User');
      expect(result2).toContain('Free User');
    });

    it('should handle loops', () => {
      const template = `
        {{#each items}}
          - {{this.name}}
        {{/each}}
      `;

      const context = {
        items: [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }],
      };

      const result = service.process(template, context);

      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).toContain('Item 3');
    });

    it('should handle nested conditionals and loops', () => {
      const template = `
        {{#each users}}
          {{#if this.active}}
            Active: {{this.name}}
          {{/if}}
        {{/each}}
      `;

      const context = {
        users: [
          { name: 'João', active: true },
          { name: 'Maria', active: false },
          { name: 'Pedro', active: true },
        ],
      };

      const result = service.process(template, context);

      expect(result).toContain('Active: João');
      expect(result).not.toContain('Active: Maria');
      expect(result).toContain('Active: Pedro');
    });
  });
});