import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with authentication and admin access
router.use(protect);
router.use(admin);

router.route('/stats').get(getDashboardStats);

export default router;
