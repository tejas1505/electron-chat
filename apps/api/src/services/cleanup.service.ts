import { messageService } from './message.service';
import { logger } from '../config/logger';

// Run expired message cleanup every 30 seconds
export function startCleanupJob() {
  const run = async () => {
    try {
      const count = await messageService.cleanupExpiredMessages();
      if (count > 0) logger.info(`Cleaned up ${count} expired messages`);
    } catch (err) {
      logger.error('Cleanup job failed', err);
    }
  };

  run(); // Run immediately on start
  const interval = setInterval(run, 30_000);

  logger.info('Disappearing message cleanup job started (every 30s)');
  return interval;
}
