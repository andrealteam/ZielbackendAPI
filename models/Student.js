import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
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
    required: [true, 'Please add a contact number']
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  className: {
    type: String,
    required: [true, 'Please enter a class']
  },
  courses: {
    physics: { 
      selected: Boolean, 
      fee: Number, 
      classes: Number,
      total: Number 
    },
    chemistry: { 
      selected: Boolean, 
      fee: Number, 
      classes: Number,
      total: Number 
    },
    math: { 
      selected: Boolean, 
      fee: Number, 
      classes: Number,
      total: Number 
    },
    biology: { 
      selected: Boolean, 
      fee: Number, 
      classes: Number,
      total: Number 
    },
    computerScience: { 
      selected: Boolean, 
      fee: Number, 
      classes: Number,
      total: Number 
    }
  },
  courseMode: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  startDate: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date'],
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please add total amount']
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
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Encrypt password using bcrypt
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
StudentSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Match user entered password to hashed password in database
StudentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Student', StudentSchema);