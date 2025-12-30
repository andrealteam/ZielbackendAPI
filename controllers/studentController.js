import Student from '../models/Student.js';
import asyncHandler from 'express-async-handler';

// @desc    Get all students
// @route   GET /api/students
// @access  Public
// @desc    Get all students
// @route   GET /api/students
// @access  Public
export const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({})
    .sort({ createdAt: -1 })
    .select('-password -__v')
    .lean();
  
  // Transform the data to ensure consistent structure
  const formattedStudents = students.map(student => ({
    id: student._id,
    name: student.name,
    email: student.email,
    contactNo: student.contactNo,
    address: student.address,
    className: student.className,
    courseMode: student.courseMode,
    startDate: student.startDate,
    endDate: student.endDate,
    totalAmount: student.totalAmount,
    courses: student.courses,
    role: student.role,
    createdAt: student.createdAt
  }));

  res.status(200).json(formattedStudents);
});

// @desc    Get student count
// @route   GET /api/students/count
// @access  Public
export const getStudentCount = asyncHandler(async (req, res) => {
  const count = await Student.countDocuments({});
  res.status(200).json({ count });
});

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Public
export const getStudentById = asyncHandler(async (req, res) => {
  try {
    console.log(`Fetching student with ID: ${req.params.id}`);
    const student = await Student.findById(req.params.id);
    
    if (student) {
      console.log('Student found:', student._id);
      res.status(200).json(student);
    } else {
      console.log(`Student not found with ID: ${req.params.id}`);
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    console.error('Error in getStudentById:', error.message);
    console.error('Error details:', error);
    res.status(400).json({ 
      message: 'Invalid ID format',
      error: error.message 
    });
  }
});

// @desc    Create a student
// @route   POST /api/students
// @access  Private/Admin

export const registerStudent = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    contactNo,
    address,
    className,
    courses,
    courseMode,
    startDate,
    endDate,
    password
  } = req.body;

  // Calculate total amount and individual course totals
  let totalAmount = 0;
  const updatedCourses = { ...courses };
  
  Object.keys(updatedCourses).forEach(courseKey => {
    const course = updatedCourses[courseKey];
    if (course.selected && course.fee) {
      const fee = parseInt(course.fee, 10) || 0;
      const classes = parseInt(course.classes, 10) || 1;
      const courseTotal = fee * classes;
      
      updatedCourses[courseKey] = {
        ...course,
        fee: fee,
        classes: classes,
        total: courseTotal
      };
      
      totalAmount += courseTotal;
    } else {
      updatedCourses[courseKey] = {
        selected: false,
        fee: 0,
        classes: 0,
        total: 0
      };
    }
  });

  // Create student
  const student = await Student.create({
    name,
    email,
    contactNo,
    address,
    className,
    courses: updatedCourses,
    courseMode,
    startDate,
    endDate,
    totalAmount,
    password
  });

  // Create token
  const token = student.getSignedJwtToken();

  res.status(201).json({
    success: true,
    token,
    data: student
  });
});
// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private/Admin
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // If courses are being updated, recalculate totals
  if (req.body.courses) {
    let totalAmount = 0;
    const updatedCourses = { ...req.body.courses };
    
    Object.keys(updatedCourses).forEach(courseKey => {
      const course = updatedCourses[courseKey];
      if (course.selected && course.fee) {
        const fee = parseInt(course.fee, 10) || 0;
        const classes = parseInt(course.classes, 10) || 1;
        const courseTotal = fee * classes;
        
        updatedCourses[courseKey] = {
          ...course,
          fee: fee,
          classes: classes,
          total: courseTotal
        };
        
        totalAmount += courseTotal;
      } else {
        updatedCourses[courseKey] = {
          selected: false,
          fee: 0,
          classes: 0,
          total: 0
        };
      }
    });

    student.courses = updatedCourses;
    student.totalAmount = totalAmount;
  }

  // Update other fields
  student.name = req.body.name || student.name;
  student.email = req.body.email || student.email;
  student.contactNo = req.body.contactNo || student.contactNo;
  student.address = req.body.address || student.address;
  student.className = req.body.className || student.className;
  student.courseMode = req.body.courseMode || student.courseMode;
  student.startDate = req.body.startDate || student.startDate;
  student.endDate = req.body.endDate || student.endDate;
  
  if (req.body.password) {
    student.password = req.body.password;
  }

  const updatedStudent = await student.save();
  res.status(200).json(updatedStudent);
});

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/Admin
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (student) {
    await student.remove();
    res.status(200).json({ message: 'Student removed' });
  } else {
    res.status(404);
    throw new Error('Student not found');
  }
});
