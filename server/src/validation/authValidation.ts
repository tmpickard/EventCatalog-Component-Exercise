import type { NewUser } from '../types/user.js';

type LoginCredentials = { email: string; password: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}

export function validateRegistration(value: unknown): NewUser | undefined {
  if (
    !isRecord(value) ||
    Object.keys(value).some((field) => !['email', 'displayName', 'password'].includes(field)) ||
    !isValidEmail(value.email) ||
    typeof value.displayName !== 'string' ||
    value.displayName.trim().length < 2 ||
    value.displayName.trim().length > 60 ||
    !isValidPassword(value.password)
  ) {
    return undefined;
  }

  return {
    email: value.email.trim().toLowerCase(),
    displayName: value.displayName.trim(),
    password: value.password,
  };
}

export function validateLogin(value: unknown): LoginCredentials | undefined {
  if (
    !isRecord(value) ||
    Object.keys(value).some((field) => !['email', 'password'].includes(field)) ||
    !isValidEmail(value.email) ||
    !isValidPassword(value.password)
  ) {
    return undefined;
  }

  return { email: value.email.trim().toLowerCase(), password: value.password };
}

export const invalidAuthDataError = {
  error: {
    code: 'INVALID_AUTH_DATA',
    message: 'The supplied authentication information is invalid.',
  },
};
