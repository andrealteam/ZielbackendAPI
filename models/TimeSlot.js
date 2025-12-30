import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  teacherType: {
    type: String,
    enum: ['full-time', 'part-time', 'visiting'],
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // Matches HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ // Matches HH:MM format
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  subject: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to populate names and teacher type
timeSlotSchema.pre('save', async function(next) {
  try {
    if (this.isNew || this.isModified('teacher')) {
      const Teacher = mongoose.model('Teacher');
      const teacher = await Teacher.findById(this.teacher);
      if (teacher) {
        this.teacherName = teacher.name;
        this.teacherType = teacher.teacherType;
      }
    }
    
    if (this.isNew || this.isModified('student')) {
      const Student = mongoose.model('Student');
      const student = await Student.findById(this.student);
      if (student) {
        this.studentName = student.name;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Prevent double booking for teacher in same time slot
timeSlotSchema.index(
  { teacher: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true, message: 'This time slot is already booked for the selected teacher' }
);

// Prevent student from booking overlapping slots
timeSlotSchema.index(
  { student: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true, partialFilterExpression: { status: 'scheduled' } }
);

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;
