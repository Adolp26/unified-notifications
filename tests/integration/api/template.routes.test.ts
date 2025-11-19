import request from 'supertest';
import express, { Application } from 'express';
import templateRoutes from '../../../src/api/routes/template.routes';
import { AppDataSource } from '../../../src/config/database.config';

const app: Application = express();
app.use(express.json());
app.use('/api/v1/templates', templateRoutes);

describe('Template Routes Integration', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    const repository = AppDataSource.getRepository('Template');
    await repository.clear();
    await AppDataSource.destroy();
  });

  describe('POST /api/v1/templates', () => {
    it('should create a new template', async () => {
      const response = await request(app)
        .post('/api/v1/templates')
        .send({
          name: 'test_email',
          channel: 'email',
          subject: 'Test Subject',
          body: 'Hello {{name}}',
          variables: ['name'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('test_email');
      expect(response.body.channel).toBe('email');
    });

    it('should return 400 for duplicate name', async () => {
      await request(app).post('/api/v1/templates').send({
        name: 'duplicate_test',
        channel: 'email',
        body: 'Body',
      });

      const response = await request(app)
        .post('/api/v1/templates')
        .send({
          name: 'duplicate_test',
          channel: 'sms',
          body: 'Another body',
        })
        .expect(400);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/v1/templates', () => {
    it('should return all templates', async () => {
      const response = await request(app).get('/api/v1/templates').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should return template by id', async () => {
      const created = await request(app).post('/api/v1/templates').send({
        name: 'findbyid_test',
        channel: 'email',
        body: 'Body',
      });

      const response = await request(app)
        .get(`/api/v1/templates/${created.body.id}`)
        .expect(200);

      expect(response.body.id).toBe(created.body.id);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app)
        .get('/api/v1/templates/123e4567-e89b-12d3-a456-426614174000')
        .expect(404);
    });
  });
});