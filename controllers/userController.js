import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign(
    { id }, 
    process.env.JWT_SECRET || 'fallbacksecret',
    { expiresIn: '30d' }
  );
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, phoneNumber, password, role } = req.body;
    console.log(req.body);

    // Basic validation
    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Name is required' 
      });
    }

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid role (admin or user) is required' 
      });
    }

    // Role-specific validation
    if (role === 'admin') {
      if (!email) {
        return res.status(400).json({ 
          success: false,
          message: 'Email is required for admin accounts' 
        });
      }
      if (!password) {
        return res.status(400).json({ 
          success: false,
          message: 'Password is required for admin accounts' 
        });
      }
      if (password.length < 6) {
        return res.status(400).json({ 
          success: false,
          message: 'Password must be at least 6 characters long' 
        });
      }
    }

    if (role === 'user') {
      if (!phoneNumber) {
        return res.status(400).json({ 
          success: false,
          message: 'Phone number is required for user accounts' 
        });
      }
      if (!/^[0-9]{10}$/.test(phoneNumber)) {
        return res.status(400).json({ 
          success: false,
          message: 'Phone number must be 10 digits' 
        });
      }
    }

    // Check for existing user based on role
    let existingUser;
    if (role === 'admin') {
      existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    } else {
      existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
    }

    const user = await User.create({
      name,
      email,
      phoneNumber,
      password,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      userData: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: error.message 
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;
    
    let user = null;
    let errorMessage = '';
    
    // User login with phone number
    if (phoneNumber) {
      if (!/^[0-9]{10}$/.test(phoneNumber)) {
        return res.status(400).json({ 
          success: false,
          message: 'Phone number must be 10 digits' 
        });
      }

      user = await User.findOne({ phoneNumber, role: 'user' });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User account not found with this phone number' 
        });
      }
    } 
    // Admin login with email and password
    else if (email && password) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid email format' 
        });
      }

      user = await User.findOne({ email, role: 'admin' });
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Admin account not found with this email' 
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid password' 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide either phone number for user or email and password for admin' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      userData: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: error.message 
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching profile' 
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }

    const users = await User.find({}).select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete users'
      });
    }

    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot delete their own account'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
      error: error.message
    });
  }
};