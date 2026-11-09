import { isEventFormat, type EventChanges, type NewEvent } from '../types/event.js';

export const invalidEventDataError = {
  error: {
    code: 'INVALID_EVENT_DATA',
    message: 'The supplied event information is invalid.',
  },
};

const stateAbbreviations = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]);

const editableFields = new Set(['name', 'city', 'state', 'date', 'capacity', 'format']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidState(value: unknown): value is string {
  return typeof value === 'string' && stateAbbreviations.has(value);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (daysInMonth[month - 1] ?? 0);
}

function isValidCapacity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isValidField(field: string, value: unknown): boolean {
  switch (field) {
    case 'name':
    case 'city':
      return isValidName(value);
    case 'state':
      return isValidState(value);
    case 'date':
      return isValidDate(value);
    case 'capacity':
      return isValidCapacity(value);
    case 'format':
      return isEventFormat(value);
    default:
      return false;
  }
}

export function validateNewEvent(value: unknown): NewEvent | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const requiredFields = ['name', 'city', 'state', 'date', 'capacity', 'format'];
  if (
    Object.keys(value).some((field) => !editableFields.has(field)) ||
    requiredFields.some((field) => !Object.hasOwn(value, field) || !isValidField(field, value[field]))
  ) {
    return undefined;
  }

  return {
    name: (value.name as string).trim(),
    city: (value.city as string).trim(),
    state: value.state as string,
    date: value.date as string,
    capacity: value.capacity as number,
    format: value.format as NewEvent['format'],
  };
}

export function validateEventChanges(value: unknown): EventChanges | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fields = Object.keys(value);
  if (
    fields.length === 0 ||
    fields.some((field) => !editableFields.has(field) || !isValidField(field, value[field]))
  ) {
    return undefined;
  }

  const changes: EventChanges = {};
  for (const field of fields) {
    const fieldValue = value[field];
    switch (field) {
      case 'name':
        changes.name = (fieldValue as string).trim();
        break;
      case 'city':
        changes.city = (fieldValue as string).trim();
        break;
      case 'state':
        changes.state = fieldValue as string;
        break;
      case 'date':
        changes.date = fieldValue as string;
        break;
      case 'capacity':
        changes.capacity = fieldValue as number;
        break;
      case 'format':
        changes.format = fieldValue as NewEvent['format'];
        break;
    }
  }

  return changes;
}
