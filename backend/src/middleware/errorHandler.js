const config = require('../config/config');

/**
 * Custom error class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error catcher
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found handler
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  if (config.app.env === 'development') {
    console.error('Error:', err);
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    error = new AppError(messages.join('. '), 400);
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0].path;
    error = new AppError(`${field} already exists`, 400);
  }

  // JWT errors handled in auth middleware

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(config.app.env === 'development' && { 
      error: err,
      stack: err.stack 
    })
  });
};

module.exports = {
  AppError,
  catchAsync,
  notFound,
  errorHandler
};