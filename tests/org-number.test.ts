import { describe, it, expect } from 'vitest';
import { validateNorwegianOrgNumber, formatOrgNumber, cleanOrgNumber } from '../src/lib/validation';

describe('Norwegian Organization Number Validation (Modulus 11)', () => {
  it('should accept valid Norwegian organization numbers with correct Mod11 checksums', () => {
    // Real verified Norwegian companies
    const validNumbers = [
      '923609016', // Equinor ASA
      '984851006', // DNB Bank ASA
      '990888213', // Telenor ASA
      '914778271', // Norsk Hydro ASA
      '933649768', // Schibsted ASA
      '986228608', // Yara International ASA
      '982463718', // Vipps MobilePay AS
      '983544622', // Visma AS
    ];

    for (const org of validNumbers) {
      const res = validateNorwegianOrgNumber(org);
      expect(res.valid, `Expected ${org} to be valid`).toBe(true);
      expect(res.cleanNumber).toBe(org);
    }
  });

  it('should clean spaces, hyphens and dots from input', () => {
    const res = validateNorwegianOrgNumber(' 923 609 016 ');
    expect(res.valid).toBe(true);
    expect(res.cleanNumber).toBe('923609016');
    expect(res.formattedNumber).toBe('923 609 016');

    const res2 = validateNorwegianOrgNumber('984-851-006');
    expect(res2.valid).toBe(true);
    expect(res2.cleanNumber).toBe('984851006');
  });

  it('should reject inputs with fewer or more than 9 digits', () => {
    expect(validateNorwegianOrgNumber('12345678').valid).toBe(false);
    expect(validateNorwegianOrgNumber('1234567890').valid).toBe(false);
    expect(validateNorwegianOrgNumber('').valid).toBe(false);
  });

  it('should reject non-numeric characters', () => {
    const res = validateNorwegianOrgNumber('92360901A');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('contain only numeric digits');
  });

  it('should reject incorrect Modulus 11 checksums', () => {
    // Equinor is 923609016. If last digit is changed to 7, it must fail.
    const res = validateNorwegianOrgNumber('923609017');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid Modulus 11 checksum');
  });

  it('should reject checksums that result in illegal control digit 10', () => {
    // Mod11 weights result in remainder 1, which requires 11 - 1 = 10 (illegal in Norwegian register)
    const illegalNumber = '880109122';
    const res = validateNorwegianOrgNumber(illegalNumber);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('illegal control digit 10');
  });

  it('should format numbers correctly as XXX XXX XXX', () => {
    expect(formatOrgNumber('923609016')).toBe('923 609 016');
  });
});
