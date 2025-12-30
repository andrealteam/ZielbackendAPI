import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  contactNo: {
    type: String,
    required: [true, 'Please add a contact number'],
    maxlength: [20, 'Phone number can not be longer than 20 characters']
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  teacherType: {
    type: String,
    required: [true, 'Please select teacher type'],
    enum: ['full-time', 'part-time', 'visiting'],
    default: 'full-time'
  },
  availableTimeSlots: [{
    dayOfWeek: {
      type: Number,
      required: [true, 'Please select a day of the week'],
      min: 0, // 0 = Sunday, 1 = Monday, etc.
      max: 6
    },
    startTime: {
      type: String,
      required: [true, 'Please provide start time'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format (24-hour)']
    },
    endTime: {
      type: String,
      required: [true, 'Please provide end time'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format (24-hour)'],
      validate: {
        validator: function(endTime) {
          return this.startTime < endTime;
        },
        message: 'End time must be after start time'
      }
    },
    isRecurring: {
      type: Boolean,
      default: true
    }
  }],
  subjects: {
    physics: {
      selected: { type: Boolean, default: false },
      fee: { type: Number, default: 0 }
    },
    chemistry: {
      selected: { type: Boolean, default: false },
      fee: { type: Number, default: 0 }
    },
    math: {
      selected: { type: Boolean, default: false },
      fee: { type: Number, default: 0 }
    },
    biology: {
      selected: { type: Boolean, default: false },
      fee: { type: Number, default: 0 }
    },
    computerScience: {
      selected: { type: Boolean, default: false },
      fee: { type: Number, default: 0 }
    }
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
teacherSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Encrypt password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
teacherSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
teacherSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Teacher', teacherSchema);
