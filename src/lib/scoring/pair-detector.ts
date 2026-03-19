import type { PairStatus } from '@/types';

interface PairResult {
  pair_friendliness_status: PairStatus;
  pair_friendliness_score: number;
  pair_friendliness_evidence: string | null;
}

const YES_PATTERNS = [
  /couples?\s+welcome/i,
  /partners?\s+welcome/i,
  /two\s+people/i,
  /2\s+people/i,
];

const MAYBE_PATTERNS = [
  /multiple\s+positions/i,
  /several\s+(positions|vacancies|openings|staff)/i,
  /we('re|\s+are)\s+hiring\s+(several|multiple|many)/i,
  /seasonal\s+team/i,
  /staff\s+(housing|accommodation).{0,40}shared/i,
  /shared\s+(rooms?|apartments?|accommodation)/i,
  /(\d+)\s+(positions|vacancies|openings)/i,
];

export function detectPairFriendliness(text: string): PairResult {
  for (const pattern of YES_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const excerpt = text.slice(
        Math.max(0, match.index - 40),
        Math.min(text.length, match.index + match[0].length + 40)
      );
      return {
        pair_friendliness_status: 'yes',
        pair_friendliness_score: 90,
        pair_friendliness_evidence: excerpt,
      };
    }
  }

  for (const pattern of MAYBE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const excerpt = text.slice(
        Math.max(0, match.index - 40),
        Math.min(text.length, match.index + match[0].length + 40)
      );
      return {
        pair_friendliness_status: 'maybe',
        pair_friendliness_score: 55,
        pair_friendliness_evidence: excerpt,
      };
    }
  }

  return {
    pair_friendliness_status: 'unknown',
    pair_friendliness_score: 10,
    pair_friendliness_evidence: null,
  };
}
