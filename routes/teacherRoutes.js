import express from 'express';
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeachersCount
} from '../controllers/teacherController.js';

const router = express.Router();

// Public routes
router.route('/').get(getTeachers);
router.get('/count', getTeachersCount);  // This needs to come before /:id
router.route('/:id').get(getTeacherById);

// Protected routes (add authentication middleware later)
router.route('/').post(createTeacher);
router.route('/:id').put(updateTeacher).delete(deleteTeacher);

export default router;
