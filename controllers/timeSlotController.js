import asyncHandler from 'express-async-handler';
import TimeSlot from '../models/TimeSlot.js';
import Teacher from '../models/Teacher.js';
import Student from '../models/Student.js';

// @desc    Create a new time slot
// @route   POST /api/timeslots
// @access  Private/Admin
export const createTimeSlot = asyncHandler(async (req, res) => {
  const { 
    teacherId, 
    studentId, 
    teacherName, 
    studentName, 
    teacherType, 
    date, 
    startTime, 
    endTime, 
    subject, 
    notes 
  } = req.body;

  // Check if teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    res.status(404);
    throw new Error('Teacher not found');
  }

  // Check if student exists
  const student = await Student.findById(studentId);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // Check if teacher is part-time or visiting and validate time slot
  if (teacher.teacherType === 'part-time' || teacher.teacherType === 'visiting') {
    const slotDate = new Date(date);
    const dayOfWeek = slotDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Check if the requested time slot is within any of the teacher's available slots
    const isTimeSlotValid = teacher.availableTimeSlots.some(slot => {
      // If it's a recurring slot, check day of week, otherwise check specific date
      const isDayMatch = slot.isRecurring 
        ? slot.dayOfWeek === dayOfWeek 
        : new Date(slot.dayOfWeek).toDateString() === slotDate.toDateString();
      
      return (
        isDayMatch &&
        startTime >= slot.startTime &&
        endTime <= slot.endTime
      );
    });

    if (!isTimeSlotValid) {
      res.status(400);
      throw new Error('This time slot is not available for the selected teacher');
    }

    // Check if teacher already has a booking for this date and time
    const existingBooking = await TimeSlot.findOne({
      _id: { $ne: req.params.id },
      teacher: teacherId,
      date: slotDate,
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        { startTime: { $gte: startTime, $lt: endTime } },
        { endTime: { $gt: startTime, $lte: endTime } }
      ],
      status: 'scheduled'
    });

    if (existingBooking) {
      res.status(400);
      throw new Error('Teacher already has a booking that overlaps with this time slot');
    }
  }

  // Check for time slot conflicts
  const conflictingSlot = await TimeSlot.findOne({
    $or: [
      // Check for teacher's availability
      {
        teacher: teacherId,
        date: new Date(date),
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
          { startTime: { $gte: startTime, $lt: endTime } },
          { endTime: { $gt: startTime, $lte: endTime } }
        ],
        status: 'scheduled'
      },
      // Check for student's availability
      {
        student: studentId,
        date: new Date(date),
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
          { startTime: { $gte: startTime, $lt: endTime } },
          { endTime: { $gt: startTime, $lte: endTime } }
        ],
        status: 'scheduled'
      }
    ]
  });

  if (conflictingSlot) {
    res.status(400);
    throw new Error('Time slot conflicts with an existing booking');
  }

  const timeSlot = await TimeSlot.create({
    teacher: teacherId,
    teacherName: teacherName || teacher.name,
    teacherType: teacherType || teacher.teacherType,
    student: studentId,
    studentName: studentName || student.name,
    date: new Date(date),
    startTime,
    endTime,
    subject,
    notes,
    status: 'scheduled'
  });

  res.status(201).json({
    success: true,
    data: timeSlot
  });
});

// @desc    Get all time slots with filters
// @route   GET /api/timeslots
// @access  Private
export const getTimeSlots = asyncHandler(async (req, res) => {
  const { teacherId, studentId, startDate, endDate, status } = req.query;
  const query = {};

  if (teacherId) query.teacher = teacherId;
  if (studentId) query.student = studentId;
  if (status) query.status = status;
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const timeSlots = await TimeSlot.find(query)
    .populate('teacher', 'name email')
    .populate('student', 'name email')
    .sort({ date: 1, startTime: 1 });

  res.status(200).json({
    success: true,
    count: timeSlots.length,
    data: timeSlots
  });
});

// @desc    Update a time slot
// @route   PUT /api/timeslots/:id
// @access  Private/Admin
export const updateTimeSlot = asyncHandler(async (req, res) => {
  const { date, startTime, endTime, status, notes } = req.body;
  const timeSlot = await TimeSlot.findById(req.params.id).populate('teacher', 'teacherType');

  if (!timeSlot) {
    res.status(404);
    throw new Error('Time slot not found');
  }

  // Check if teacher is part-time and validate time slot
  if (timeSlot.teacher.teacherType === 'part-time') {
    // For part-time teachers, only allow 9:00 AM - 10:00 AM time slot
    const checkStartTime = startTime || timeSlot.startTime;
    const checkEndTime = endTime || timeSlot.endTime;
    
    if (checkStartTime !== '09:00' || checkEndTime !== '10:00') {
      res.status(400);
      throw new Error('Part-time teachers can only have time slots from 9:00 AM to 10:00 AM');
    }

    // If date is being updated, check for existing booking on new date
    if (date) {
      const existingPartTimeBooking = await TimeSlot.findOne({
        _id: { $ne: timeSlot._id },
        teacher: timeSlot.teacher,
        date: new Date(date),
        status: 'scheduled'
      });

      if (existingPartTimeBooking) {
        res.status(400);
        throw new Error('Part-time teachers can only have one booking per day');
      }
    }
  }

  // If updating time, check for conflicts
  if (date || startTime || endTime) {
    const checkDate = date ? new Date(date) : timeSlot.date;
    const checkStartTime = startTime || timeSlot.startTime;
    const checkEndTime = endTime || timeSlot.endTime;

    const conflictingSlot = await TimeSlot.findOne({
      _id: { $ne: timeSlot._id },
      $or: [
        {
          teacher: timeSlot.teacher,
          date: checkDate,
          $or: [
            { startTime: { $lt: checkEndTime }, endTime: { $gt: checkStartTime } },
            { startTime: { $gte: checkStartTime, $lt: checkEndTime } },
            { endTime: { $gt: checkStartTime, $lte: checkEndTime } }
          ],
          status: 'scheduled'
        },
        {
          student: timeSlot.student,
          date: checkDate,
          $or: [
            { startTime: { $lt: checkEndTime }, endTime: { $gt: checkStartTime } },
            { startTime: { $gte: checkStartTime, $lt: checkEndTime } },
            { endTime: { $gt: checkStartTime, $lte: checkEndTime } }
          ],
          status: 'scheduled'
        }
      ]
    });

    if (conflictingSlot) {
      res.status(400);
      throw new Error('Updated time slot conflicts with an existing booking');
    }
  }

  timeSlot.date = date ? new Date(date) : timeSlot.date;
  if (startTime) timeSlot.startTime = startTime;
  if (endTime) timeSlot.endTime = endTime;
  if (status) timeSlot.status = status;
  if (notes !== undefined) timeSlot.notes = notes;

  const updatedTimeSlot = await timeSlot.save();

  res.status(200).json({
    success: true,
    data: updatedTimeSlot
  });
});

// @desc    Delete a time slot
// @route   DELETE /api/timeslots/:id
// @access  Private/Admin
export const deleteTimeSlot = asyncHandler(async (req, res) => {
  const timeSlot = await TimeSlot.findById(req.params.id);

  if (!timeSlot) {
    res.status(404);
    throw new Error('Time slot not found');
  }

  await timeSlot.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get available time slots for a teacher on a specific date
// @route   GET /api/timeslots/available
// @access  Private
// @desc    Get available students for a time slot
// @route   GET /api/timeslots/available-students
// @access  Private
export const getAvailableStudents = asyncHandler(async (req, res) => {
  const { teacherId, date, startTime, endTime, excludeBooked = true } = req.query;
  
  if (!teacherId || !date || !startTime || !endTime) {
    res.status(400);
    throw new Error('Teacher ID, date, start time, and end time are required');
  }

  try {
    // First, find all students
    const allStudents = await Student.find({}).select('-password -__v');
    
    // If we're excluding already booked students, find students who are already booked in this time slot
    let bookedStudentIds = [];
    if (excludeBooked === 'true') {
      const overlappingSlots = await TimeSlot.find({
        date: new Date(date),
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
          { startTime: { $gte: startTime, $lt: endTime } },
          { endTime: { $gt: startTime, $lte: endTime } }
        ]
      });
      
      bookedStudentIds = overlappingSlots
        .filter(slot => slot.student) // Only include slots with assigned students
        .map(slot => slot.student.toString());
    }

    // Filter out booked students if needed
    const availableStudents = allStudents
      .filter(student => !bookedStudentIds.includes(student._id.toString()))
      .map(student => ({
        _id: student._id,
        fullName: student.name,
        email: student.email,
        contactNo: student.contactNo,
        className: student.className
      }));

    res.status(200).json({
      success: true,
      count: availableStudents.length,
      data: availableStudents
    });
  } catch (error) {
    console.error('Error in getAvailableStudents:', error);
    res.status(500);
    throw new Error('Error fetching available students');
  }
});

// @desc    Get available time slots
// @route   GET /api/timeslots/available
// @access  Private
export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { teacherId, date } = req.query;
  
  if (!teacherId || !date) {
    res.status(400);
    throw new Error('Teacher ID and date are required');
  }

  const selectedDate = new Date(date);
  const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

  // Get all booked slots for the teacher on the selected date
  const bookedSlots = await TimeSlot.find({
    teacher: teacherId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: 'scheduled'
  }).select('startTime endTime');

  // Default working hours (can be customized per teacher)
  const workingHours = {
    start: '09:00',
    end: '18:00',
    slotDuration: 60 // in minutes
  };

  // Generate all possible time slots for the day
  const [startHour, startMinute] = workingHours.start.split(':').map(Number);
  const [endHour, endMinute] = workingHours.end.split(':').map(Number);
  
  const startTime = new Date(selectedDate);
  startTime.setHours(startHour, startMinute, 0, 0);
  
  const endTime = new Date(selectedDate);
  endTime.setHours(endHour, endMinute, 0, 0);
  
  const slotDuration = workingHours.slotDuration * 60 * 1000; // Convert to milliseconds
  const slots = [];
  
  let currentSlotStart = new Date(startTime);
  
  while (currentSlotStart < endTime) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration);
    
    if (currentSlotEnd <= endTime) {
      slots.push({
        start: currentSlotStart.toTimeString().substring(0, 5),
        end: currentSlotEnd.toTimeString().substring(0, 5),
        available: true
      });
    }
    
    currentSlotStart = new Date(currentSlotStart.getTime() + slotDuration);
  }
  
  // Mark booked slots as unavailable
  bookedSlots.forEach(booked => {
    const index = slots.findIndex(slot => 
      slot.start === booked.startTime && slot.end === booked.endTime
    );
    
    if (index !== -1) {
      slots[index].available = false;
    }
  });

  res.status(200).json({
    success: true,
    data: slots
  });
});
