const { body, param, validationResult } = require('express-validator');

// Validation rules
const validators = {
  // Auth validators
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters long')
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // URL validators
  createUrl: [
    body('originalUrl')
      .isURL({ 
        protocols: ['http', 'https'],
        require_protocol: true 
      })
      .withMessage('Please provide a valid URL with http:// or https://'),
    body('customAlias')
      .optional()
      .trim()
      .isAlphanumeric('en-US', { ignore: '-_' })
      .withMessage('Custom alias can only contain letters, numbers, hyphens, and underscores')
      .isLength({ min: 3, max: 50 })
      .withMessage('Custom alias must be between 3 and 50 characters'),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title must not exceed 200 characters')
  ],

  // Param validators
  shortCode: [
    param('shortCode')
      .trim()
      .notEmpty()
      .withMessage('Short code is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Invalid short code')
  ]
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  validators,
  validate
};