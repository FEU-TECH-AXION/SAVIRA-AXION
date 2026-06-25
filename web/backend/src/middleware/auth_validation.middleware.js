const { body, validationResult } = require('express-validator');

const NAME_PATTERN = /^\p{L}+(?:[ -]\p{L}+)*$/u;

// Define rules
const loginRules = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const signupRules = [
body('firstName')
  .trim()
  .notEmpty().withMessage('First name is required')
  .isLength({ min: 2 }).withMessage('First name must be at least 2 characters')
  .isLength({ max: 50 }).withMessage('First name must not exceed 50 characters')
  .matches(NAME_PATTERN).withMessage('First name can only contain letters with single spaces or hyphens between name parts'),

body('lastName')
  .trim()
  .notEmpty().withMessage('Last name is required')
  .isLength({ min: 2 }).withMessage('Last name must be at least 2 characters')
  .isLength({ max: 50 }).withMessage('Last name must not exceed 50 characters')
  .matches(NAME_PATTERN).withMessage('Last name can only contain letters with single spaces or hyphens between name parts'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-zA-Z]/).withMessage('Password must contain at least one letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),

    body('agreed')
    .equals('true').withMessage('You must agree to the Terms & Conditions.'),
];

// Check the rules and return errors if any
const validateInput = (req, res, next) => {
  const errors = validationResult(req);

  // console.log('Errors found:', errors.array()); 

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next(); // Passes to controller ONLY if valid
};

module.exports = { loginRules, signupRules, validateInput };
