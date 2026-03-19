import type { HousingStatus } from '@/types';

interface HousingResult {
  housing_status: HousingStatus;
  housing_confidence: number;
  housing_evidence: string | null;
}

const YES_PATTERNS = [
  /accommodation\s+(provided|included|available|offered)/i,
  /housing\s+(provided|included|available|offered)/i,
  /staff\s+(accommodation|housing)/i,
  /employee\s+housing/i,
  /live[- ]in/i,
  /lodging\s+(included|provided)/i,
  /room\s+(included|provided)/i,
  /place\s+to\s+stay\s+(provided|included|available)/i,
  /accommodation\s+can\s+be\s+arranged/i,
];

const MAYBE_PATTERNS = [
  /accommodation\s+available\s+nearby/i,
  /housing\s+assistance/i,
  /help\s+(finding|with)\s+(housing|accommodation)/i,
  /shared\s+(apartment|house|accommodation)/i,
];

export function detectHousing(text: string): HousingResult {
  for (const pattern of YES_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const idx = match.index;
      const excerpt = text.slice(
        Math.max(0, idx - 60),
        Math.min(text.length, idx + match[0].length + 60)
      );
      return {
        housing_status: 'yes',
        housing_confidence: 90,
        housing_evidence: `...${excerpt}...`,
      };
    }
  }

  for (const pattern of MAYBE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const idx = match.index;
      const excerpt = text.slice(
        Math.max(0, idx - 60),
        Math.min(text.length, idx + match[0].length + 60)
      );
      return {
        housing_status: 'maybe',
        housing_confidence: 50,
        housing_evidence: `...${excerpt}...`,
      };
    }
  }

  return { housing_status: 'unknown', housing_confidence: 0, housing_evidence: null };
}
