/**
 * Validation utilities for Norwegian business entities
 */

const MOD11_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];

export interface OrgValidationResult {
  valid: boolean;
  cleanNumber: string;
  formattedNumber: string;
  error?: string;
}

/**
 * Cleans user input into raw 9-digit string
 */
export function cleanOrgNumber(input: string | number): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/\s+/g, '').replace(/[-._]/g, '').trim();
}

/**
 * Validates Norwegian Organization Number using Modulus 11
 */
export function validateNorwegianOrgNumber(input: string | number): OrgValidationResult {
  const clean = cleanOrgNumber(input);

  if (!clean) {
    return {
      valid: false,
      cleanNumber: '',
      formattedNumber: '',
      error: 'Organization number cannot be empty',
    };
  }

  if (!/^\d+$/.test(clean)) {
    return {
      valid: false,
      cleanNumber: clean,
      formattedNumber: clean,
      error: 'Organization number must contain only numeric digits',
    };
  }

  if (clean.length !== 9) {
    return {
      valid: false,
      cleanNumber: clean,
      formattedNumber: clean,
      error: `Organization number must be exactly 9 digits (got ${clean.length})`,
    };
  }

  // Calculate MOD11 Checksum
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(clean[i], 10) * MOD11_WEIGHTS[i];
  }

  const remainder = sum % 11;
  let controlDigit = remainder === 0 ? 0 : 11 - remainder;

  // If controlDigit === 10, this number is invalid per Norwegian National Registry rules
  if (controlDigit === 10) {
    return {
      valid: false,
      cleanNumber: clean,
      formattedNumber: formatOrgNumber(clean),
      error: 'Invalid organization number checksum (illegal control digit 10)',
    };
  }

  const actualControlDigit = parseInt(clean[8], 10);
  if (controlDigit !== actualControlDigit) {
    return {
      valid: false,
      cleanNumber: clean,
      formattedNumber: formatOrgNumber(clean),
      error: `Invalid Modulus 11 checksum (expected ${controlDigit}, found ${actualControlDigit})`,
    };
  }

  return {
    valid: true,
    cleanNumber: clean,
    formattedNumber: formatOrgNumber(clean),
  };
}

/**
 * Formats a 9-digit organization number as 'XXX XXX XXX'
 */
export function formatOrgNumber(orgnr: string): string {
  const clean = cleanOrgNumber(orgnr);
  if (clean.length === 9) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
  }
  return orgnr;
}

/**
 * Helper to compute the 9th digit for a given 8-digit prefix
 */
export function computeMod11ControlDigit(eightDigits: string): number | null {
  if (eightDigits.length !== 8 || !/^\d{8}$/.test(eightDigits)) return null;
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(eightDigits[i], 10) * MOD11_WEIGHTS[i];
  }
  const rem = sum % 11;
  const control = rem === 0 ? 0 : 11 - rem;
  return control === 10 ? null : control;
}
