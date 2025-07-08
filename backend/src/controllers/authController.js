const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');
const { AppError, catchAsync } = require('../middleware/errorHandler');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Register new user
 */
const register = catchAsync(async (req, res, next) => {
  const { email, password, name } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return next(new AppError('Email already registered', 400));
  }

  // Create user
  const user = await User.create({
    email,
    password,
    name
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.toJSON(),
      token
    }
  });
});

/**
 * Login user
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ where: { email } });
  if (!user) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid credentials', 401));
  }

  // Check if user is active
  if (!user.isActive) {
    return next(new AppError('Account is deactivated', 401));
  }

  // Generate token
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      token
    }
  });
});

/**
 * Get current user
 */
const getMe = catchAsync(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.toJSON()
    }
  });
});

/**
 * Update user profile
 */
const updateProfile = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const userId = req.user.id;

  // Update user
  await User.update(
    { name },
    { where: { id: userId } }
  );

  // Get updated user
  const user = await User.findByPk(userId);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: user.toJSON()
    }
  });
});

/**
 * Change password
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Get user with password
  const user = await User.findByPk(userId);

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user.id);

  res.json({
    success: true,
    message: 'Password changed successfully',
    data: {
      token
    }
  });
});

/**
 * Regenerate API key
 */
const regenerateApiKey = catchAsync(async (req, res) => {
  const userId = req.user.id;

  // Generate new API key
  const newApiKey = 'lk_' + require('crypto').randomBytes(32).toString('hex');

  // Update user
  await User.update(
    { apiKey: newApiKey },
    { where: { id: userId } }
  );

  res.json({
    success: true,
    message: 'API key regenerated successfully',
    data: {
      apiKey: newApiKey
    }
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  regenerateApiKey
};