import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();
const controller = new NotificationController();

/**
 * @route   POST /api/v1/notifications
 * @desc    Send notification (queue it)
 * @access  Public
 */
router.post('/', controller.send);

/**
 * @route   GET /api/v1/notifications/jobs/:jobId
 * @desc    Get job status
 * @access  Public
 */
router.get('/jobs/:jobId', controller.getJobStatus);

/**
 * @route   GET /api/v1/notifications/stats
 * @desc    Get queue statistics
 * @access  Public
 */
router.get('/stats', controller.getStats);

export default router;