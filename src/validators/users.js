import { check } from 'express-validator'

const EMAIL_MESSAGE = 'Please enter a valid email address.';

export const validateAuth = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage(EMAIL_MESSAGE),
  check('password', 'Password must contain 10 characters, 1 lowercase, 1 uppercase, 1 numeric and 1 special character.')
    .optional()
    .matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{10,}$/, 'g'),
];

export const validateRegister = [
  check('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage(EMAIL_MESSAGE),
  check('password', 'Password must contain 10 characters, 1 lowercase, 1 uppercase, 1 numeric and 1 special character.')
    .optional()
    .matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{10,}$/, 'g'),
];

export const validateConfirm = [
  check('confirmCode').isString()
]

export const validateGetUser = [
  check('id').notEmpty()
]

export const validateNewPassword = [
  check('np', 'Password must contain 10 characters, 1 lowercase, 1 uppercase, 1 numeric and 1 special character.')
    .optional()
    .matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{10,}$/, 'g'),
];

export const validateUpdateProfile = [
  check('firstName').optional().isString().trim(),
  check('lastName').optional().isString().trim(),
];

export const validateChangePassword = [
  check('currentPassword').notEmpty().withMessage('Current password is required'),
  check('newPassword', 'Password must contain 10 characters, 1 lowercase, 1 uppercase, 1 numeric and 1 special character.')
    .matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{10,}$/, 'g'),
];
