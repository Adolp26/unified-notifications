import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { AppDataSource } from './config/database.config';
import templateRoutes from './api/routes/template.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/v1/templates', templateRoutes);

app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = AppDataSource.isInitialized ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Unified Notifications API',
    version: '1.0.0',
    docs: '/api/docs',
    endpoints: {
      templates: '/api/v1/templates',
      health: '/health',
    },
  });
});

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    await AppDataSource.runMigrations();
    console.log('✅ Migrations executed');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📝 Templates API: http://localhost:${PORT}/api/v1/templates`);
    });
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

bootstrap();