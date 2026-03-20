import 'dotenv/config';
import { createServer } from 'http';
import { app } from './app';
import { initSocket } from './sockets';
import { connectRedis } from './config/redis';
import { logger } from './config/logger';
import { startCleanupJob } from './services/cleanup.service';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    await connectRedis();
    logger.info('Redis connected');

    const httpServer = createServer(app);
    initSocket(httpServer);

    startCleanupJob();

    httpServer.listen(PORT, () => {
      logger.info(`⚡ Electron Chat API running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

bootstrap();
