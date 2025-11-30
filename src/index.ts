import 'reflect-metadata';
import express, { Request, Response } from 'express';
import { AppDataSource } from './config/database.config';
import templateRoutes from './api/routes/template.routes';
import notificationRoutes from './api/routes/notification.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/notifications', notificationRoutes); 

// Health check
app.get('/health', async (req: Request, res: Response) => {
  const dbStatus = AppDataSource.isInitialized ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Unified Notifications API',
    version: '1.0.0',
    endpoints: {
      templates: '/api/v1/templates',
      notifications: '/api/v1/notifications',
      queueStats: '/api/v1/notifications/stats',
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
      console.log(`📊 Health: http://localhost:${PORT}/health`);
      console.log(`📝 Templates: http://localhost:${PORT}/api/v1/templates`);
      console.log(`📬 Notifications: http://localhost:${PORT}/api/v1/notifications`);
    });
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

bootstrap();