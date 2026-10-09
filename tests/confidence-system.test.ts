import { describe, it, expect } from 'vitest';
import { calculateFactConfidence, getConfidenceTier } from '../src/lib/confidence';

describe('Confidence System and Thresholds', () => {
  it('should categorize scores into proper tiers', () => {
    expect(getConfidenceTier(100)).toBe('verified');
    expect(getConfidenceTier(95)).toBe('verified');
    expect(getConfidenceTier(94)).toBe('high');
    expect(getConfidenceTier(80)).toBe('high');
    expect(getConfidenceTier(79)).toBe('needs_verification');
    expect(getConfidenceTier(60)).toBe('needs_verification');
    expect(getConfidenceTier(59)).toBe('rejected');
    expect(getConfidenceTier(0)).toBe('rejected');
  });

  it('should assign top tier confidence to official government registry facts', () => {
    const confidence = calculateFactConfidence({
      sourceType: 'official_registry',
      sourceMatchScore: 100,
      hasDirectEvidenceQuote: true,
      isOfficialRegistry: true,
    });

    expect(confidence).toBeGreaterThanOrEqual(95);
    expect(getConfidenceTier(confidence)).toBe('verified');
  });

  it('should scale down confidence when source match score is low', () => {
    const confidence = calculateFactConfidence({
      sourceType: 'company_website',
      sourceMatchScore: 60, // Borderline match
      hasDirectEvidenceQuote: false,
      isOfficialRegistry: false,
    });

    expect(confidence).toBeLessThan(60);
    expect(getConfidenceTier(confidence)).toBe('rejected');
  });
});
