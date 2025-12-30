import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import asyncHandler from 'express-async-handler';

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    const [studentCount, teacherCount] = await Promise.all([
      Student.countDocuments({}),
      Teacher.countDocuments({})
    ]);

    res.status(200).json({
      success: true,
      data: {
        studentCount,
        teacherCount,
        // You can add more statistics here as needed
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});
