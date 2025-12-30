import Teacher from '../models/Teacher.js';
import asyncHandler from 'express-async-handler';

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Public
export const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await Teacher.find({}).sort({ createdAt: -1 });
  res.status(200).json(teachers);
});

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Public
export const getTeacherById = asyncHandler(async (req, res) => {
  try {
    console.log('=== GET TEACHER BY ID ===');
    console.log('Request params:', req.params);
    console.log('Teacher ID:', req.params.id);
    
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid ID format:', req.params.id);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid teacher ID format' 
      });
    }
    
    const teacher = await Teacher.findById(req.params.id);
    
    if (!teacher) {
      console.error('Teacher not found with ID:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        error: 'Teacher not found' 
      });
    }
    
    console.log('Found teacher:', { id: teacher._id, name: teacher.name });
    res.status(200).json({
      success: true,
      data: teacher
    });
    
  } catch (error) {
    console.error('Error in getTeacherById:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      params: req.params
    });
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
});

// @desc    Create a teacher
// @route   POST /api/teachers
// @access  Private/Admin
export const createTeacher = asyncHandler(async (req, res) => {
  console.log('=== TEACHER REGISTRATION REQUEST ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  
  const {
    name,
    email,
    password,
    contactNo,
    address,
    teacherType,
    subjects,
    availableTimeSlots = []
  } = req.body;

  // Validate time slots for part-time teachers
  if (teacherType === 'part-time') {
    if (!Array.isArray(availableTimeSlots) || availableTimeSlots.length === 0) {
      res.status(400);
      throw new Error('At least one available time slot is required for part-time teachers');
    }

    // Validate each time slot
    for (const slot of availableTimeSlots) {
      if (!slot.dayOfWeek || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        res.status(400);
        throw new Error('Invalid day of week in time slot');
      }
      
      if (!slot.startTime || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.startTime)) {
        res.status(400);
        throw new Error('Invalid start time format. Use HH:MM (24-hour format)');
      }
      
      if (!slot.endTime || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(slot.endTime)) {
        res.status(400);
        throw new Error('Invalid end time format. Use HH:MM (24-hour format)');
      }
      
      if (slot.startTime >= slot.endTime) {
        res.status(400);
        throw new Error('End time must be after start time');
      }
    }
  }

  try {
    console.log('Checking if teacher exists with email:', email);
    const teacherExists = await Teacher.findOne({ email });

    if (teacherExists) {
      console.error('❌ Teacher already exists with email:', email);
      res.status(400);
      throw new Error('Teacher already exists');
    }

    console.log('Creating new teacher with data:', {
      name,
      email,
      contactNo,
      teacherType,
      subjects: Object.keys(subjects || {}).filter(sub => subjects[sub]?.selected)
    });

    const teacherData = {
      name,
      email,
      password,
      contactNo,
      address,
      teacherType,
      subjects,
      // Include availableTimeSlots only if teacher is part-time
      ...(teacherType === 'part-time' && {
        availableTimeSlots: availableTimeSlots.map(slot => ({
          dayOfWeek: parseInt(slot.dayOfWeek, 10),
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: slot.isRecurring !== false // Default to true if not specified
        }))
      })
    };
    
    console.log('Creating teacher with data:', JSON.stringify(teacherData, null, 2));

    const teacher = await Teacher.create(teacherData);

    if (teacher) {
      console.log('✅ Teacher created successfully:', {
        id: teacher._id,
        email: teacher.email,
        name: teacher.name
      });
      
      res.status(201).json({
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        contactNo: teacher.contactNo,
        address: teacher.address,
        teacherType: teacher.teacherType,
        subjects: teacher.subjects
      });
    } else {
      console.error('❌ Failed to create teacher - Invalid data');
      res.status(400);
      throw new Error('Invalid teacher data');
    }
  } catch (error) {
    console.error('❌ Error in createTeacher:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      ...(error.errors && { validationErrors: error.errors })
    });
    throw error; // Let the error handler middleware handle it
  }
});

// @desc    Update a teacher
// @route   PUT /api/teachers/:id
// @access  Private/Admin
export const updateTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (teacher) {
    teacher.name = req.body.name || teacher.name;
    teacher.email = req.body.email || teacher.email;
    teacher.contactNo = req.body.contactNo || teacher.contactNo;
    teacher.address = req.body.address || teacher.address;
    // If changing to part-time, ensure time slots are provided
    if (req.body.teacherType === 'part-time' && teacher.teacherType !== 'part-time') {
      if (!req.body.availableTimeSlots || !Array.isArray(req.body.availableTimeSlots) || req.body.availableTimeSlots.length === 0) {
        res.status(400);
        throw new Error('At least one available time slot is required for part-time teachers');
      }
    }
    
    teacher.teacherType = req.body.teacherType || teacher.teacherType;
    if (req.body.password) {
      teacher.password = req.body.password;
    }
    if (req.body.subjects) {
      teacher.subjects = req.body.subjects;
    }
    
    // Update time slots if provided
    if (req.body.availableTimeSlots && Array.isArray(req.body.availableTimeSlots)) {
      teacher.availableTimeSlots = req.body.availableTimeSlots;
    }
    
    // If changing from part-time to another type, clear time slots
    if (teacher.teacherType !== 'part-time' && req.body.teacherType !== 'part-time') {
      teacher.availableTimeSlots = [];
    }
    teacher.joiningDate = req.body.joiningDate || teacher.joiningDate;
    teacher.isActive = req.body.isActive !== undefined ? req.body.isActive : teacher.isActive;

    const updatedTeacher = await teacher.save();
    res.status(200).json(updatedTeacher);
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

// @desc    Delete a teacher
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
export const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);

  if (teacher) {
    await teacher.remove();
    res.status(200).json({ message: 'Teacher removed' });
  } else {
    res.status(404);
    throw new Error('Teacher not found');
  }
});

// @desc    Get count of all teachers
// @route   GET /api/teachers/count
// @access  Public
export const getTeachersCount = asyncHandler(async (req, res) => {
  console.log('=== GET TEACHERS COUNT ===');
  try {
    const count = await Teacher.countDocuments({});
    console.log('Total teachers count:', count);
    res.status(200).json({ 
      success: true,
      count 
    });
  } catch (error) {
    console.error('Error in getTeachersCount:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error.errors && { validationErrors: error.errors })
    });
    res.status(500).json({ 
      success: false,
      error: 'Server error',
      message: 'Failed to get teacher count'
    });
  }
});
