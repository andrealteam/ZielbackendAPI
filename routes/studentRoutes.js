import express from 'express';
import {
  getStudents,
  getStudentById,
  registerStudent,
  updateStudent,
  deleteStudent,
  getStudentCount
} from '../controllers/studentController.js';

const router = express.Router();

// Public routes
router.route('/').get(getStudents);
router.get('/count', getStudentCount);
router.get('/:id', getStudentById);

// Protected routes (add authentication middleware later)
router.route('/').post(registerStudent);
router.route('/:id').put(updateStudent).delete(deleteStudent);

export default router;
