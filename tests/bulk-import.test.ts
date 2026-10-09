import { describe, it, expect } from 'vitest';
import { validateNorwegianOrgNumber } from '../src/lib/validation';

describe('Bulk Company Ingestion & Validation Suite', () => {
  it('validates a batch of authentic Norwegian organization numbers', () => {
    const batch = [
      '923609016', // Equinor ASA
      '984851006', // DNB Bank ASA
      '990888213', // Telenor ASA
      '914778271', // Norsk Hydro ASA
      '933649768', // Schibsted ASA
      '986228608', // Yara International ASA
      '910000004', // Kyst Engineering AS
      '910000136', // Nexus Partners ASA
      '910000268', // Vann Holdings AS
      '910000527', // Aktiv Energy AS
    ];

    for (const org of batch) {
      const val = validateNorwegianOrgNumber(org);
      expect(val.valid).toBe(true);
      expect(val.cleanNumber).toBe(org);
      expect(val.cleanNumber.length).toBe(9);
    }
  });

  it('rejects invalid or corrupted entries in bulk batch without crashing', () => {
    const corruptBatch = [
      '12345678', // 8 digits (too short)
      '923609017', // Bad Mod11 check digit (expected 6)
      'ABCDEFGHI', // Non-numeric
      '999999998', // Invalid checksum (check digit 8 != 9)
      '', // Empty
    ];

    for (const corrupt of corruptBatch) {
      const val = validateNorwegianOrgNumber(corrupt);
      expect(val.valid).toBe(false);
      expect(val.error).toBeDefined();
    }
  });
});
