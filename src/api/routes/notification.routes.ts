import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();
const controller = new NotificationController();

/**
 * @route   POST /api/v1/notifications
 * @desc    Send notification (queue it)
 */
router.post('/', controller.send);

/**
 * @route   GET /api/v1/notifications
 * @desc    List notifications with filters
 */
router.get('/', controller.list);

/**
 * @route   GET /api/v1/notifications/:id
 * @desc    Get notification by ID
 */
router.get('/:id', controller.getById);

/**
 * @route   GET /api/v1/notifications/:id/logs
 * @desc    Get delivery logs for a notification
 */
router.get('/:id/logs', controller.getLogs);

/**
 * @route   GET /api/v1/notifications/jobs/:jobId
 * @desc    Get job status
 */
router.get('/jobs/:jobId', controller.getJobStatus);

/**
 * @route   GET /api/v1/notifications/stats/queue
 * @desc    Get queue statistics
 */
router.get('/stats/queue', controller.getStats);

/**
 * @route   GET /api/v1/notifications/stats/delivery
 * @desc    Get delivery statistics
 */
router.get('/stats/delivery', controller.getDeliveryStats);

/**
 * @route   GET /api/v1/notifications/stats/channels
 * @desc    Get statistics by channel
 */
router.get('/stats/channels', controller.getStatsByChannel);

/**
 * @route   GET /api/v1/notifications/logs/failed
 * @desc    Get failed delivery logs
 */
router.get('/logs/failed', controller.getFailedLogs);

/**
 * @route   GET /api/v1/notifications/stats/timeline
 * @desc    Get delivery timeline
 */
router.get('/stats/timeline', controller.getTimeline);

export default router;