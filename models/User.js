import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate email if role is admin
        if (this.role === 'admin') {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        }
        return true;
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate phone number if role is user
        if (this.role === 'user') {
          return /^[0-9]{10}$/.test(v);
        }
        return true;
      },
      message: props => `${props.value} is not a valid phone number! Must be 10 digits.`
    }
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters long'],
    validate: {
      validator: function(v) {
        // Only validate password if role is admin
        if (this.role === 'admin') {
          return v && v.length >= 6;
        }
        return true;
      },
      message: 'Password is required for admin users and must be at least 6 characters long'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      console.error('Password hashing error:', error);
      next(error);
    }
  }
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Custom validation for role-specific fields
userSchema.pre('validate', function(next) {
  if (this.role === 'admin') {
    if (!this.email) {
      this.invalidate('email', 'Email is required for admin users');
    }
    if (!this.password) {
      this.invalidate('password', 'Password is required for admin users');
    }
  }
  if (this.role === 'user') {
    if (!this.phoneNumber) {
      this.invalidate('phoneNumber', 'Phone number is required for user accounts');
    }
  }
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
