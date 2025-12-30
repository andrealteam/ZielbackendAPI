import express from 'express';
import {
  createTimeSlot,
  getTimeSlots,
  updateTimeSlot,
  deleteTimeSlot,
  getAvailableSlots,
  getAvailableStudents
} from '../controllers/timeSlotController.js';

const router = express.Router();

// Base route for time slots
router.get('/', getTimeSlots);
router.post('/', createTimeSlot);

// Available slots route
router.get('/available', getAvailableSlots);

// Available students for a slot
router.get('/available-students', getAvailableStudents);

// Specific time slot operations
router.route('/:id')
  .put(updateTimeSlot)
  .delete(deleteTimeSlot);

export default router;
