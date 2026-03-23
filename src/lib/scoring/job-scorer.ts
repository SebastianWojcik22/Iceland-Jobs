import type { NormalizedJob } from '@/providers/types';
import { detectHousing } from './housing-detector';
import { detectPairFriendliness } from './pair-detector';

interface ScoringResult {
  junior_fit_score: number;
  priority_score: number;
  housing_status: string;
  housing_confidence: number;
  housing_evidence: string | null;
  pair_friendliness_status: string;
  pair_friendliness_score: number;
  pair_friendliness_evidence: string | null;
  english_friendly_status: string;
  icelandic_required_status: string;
  normalized_summary: string;
  requirement_summary: string;
}

interface Signal {
  pattern: RegExp;
  weight: number;
}

const POSITIVE_SIGNALS: Signal[] = [
  { pattern: /no\s+experience\s+(required|necessary|needed)/i, weight: 15 },
  { pattern: /experience\s+(not\s+)?(required|necessary)/i, weight: 12 },
  { pattern: /training\s+(provided|will\s+be\s+provided|on\s+the\s+job)/i, weight: 10 },
  { pattern: /on[- ]the[- ]job\s+training/i, weight: 10 },
  { pattern: /seasonal\s+(work|position|employment)/i, weight: 8 },
  { pattern: /immediate\s+start/i, weight: 7 },
  { pattern: /\b(housekeeping|room\s+attendant|housekeeper)\b/i, weight: 12 },
  { pattern: /\b(cleaner|cleaning\s+staff)\b/i, weight: 10 },
  { pattern: /\b(kitchen\s+helper|kitchen\s+assistant|dishwasher)\b/i, weight: 12 },
  { pattern: /\bgeneral\s+worker\b/i, weight: 10 },
  { pattern: /\b(service\s+staff|hotel\s+staff|guesthouse\s+staff)\b/i, weight: 10 },
  { pattern: /multiple\s+(hires|positions|vacancies)/i, weight: 8 },
  { pattern: /\b(shift\s+work|shift\s+based)\b/i, weight: 6 },
  { pattern: /\bentry[- ]level\b/i, weight: 12 },
  { pattern: /\bbeginner[- ]friendly\b/i, weight: 10 },
  { pattern: /english\s+(accepted|ok|sufficient|welcome|is\s+enough)/i, weight: 10 },
  { pattern: /accommodation\s+(provided|included)/i, weight: 10 },
  { pattern: /staff\s+(housing|accommodation)/i, weight: 10 },
];

const NEGATIVE_SIGNALS: Signal[] = [
  { pattern: /\b3\+?\s*years?\s+(of\s+)?experience\b/i, weight: -15 },
  { pattern: /\b[4-9]\+?\s*years?\s+(of\s+)?experience\b/i, weight: -20 },
  { pattern: /\b(university|bachelor|master|phd)\s+(degree|education)\s+required\b/i, weight: -15 },
  { pattern: /\bdegree\s+required\b/i, weight: -12 },
  { pattern: /\bcertification\s+required\b/i, weight: -10 },
  { pattern: /fluent\s+icelandic\s+required/i, weight: -12 },
  // Icelandic: íslenska skylda = icelandic required, ökuréttindi = driving license
  { pattern: /íslenska\s+(er\s+)?(skylda|nauðsynleg)/i, weight: -20 },
  { pattern: /\b(ökuréttindi|ökuskírteini)\b/i, weight: -15 },
  // Requires Icelandic kennitala / e-ID — not available to applicants from Poland
  { pattern: /\bkennitala\b/i, weight: -25 },
  { pattern: /\b(auðkenni|rafræn\s+skilríki|electronic\s+identification|electronic\s+id)\b/i, weight: -25 },
  { pattern: /\bislandic\s+(id|identity|social\s+security)\b/i, weight: -20 },
  // Heavy machinery / special licenses
  { pattern: /\b(heavy\s+machinery|forklift|crane|excavator)\s+(licen|certif)/i, weight: -20 },
  { pattern: /\bmachinery\s+licen/i, weight: -20 },
  { pattern: /\b(vinnuvélaréttindi|vinnuvél)\b/i, weight: -20 }, // Icelandic: machinery license
  { pattern: /\bdriving\s+licen[sc]e\s+required\b/i, weight: -15 },
  { pattern: /\bclass\s+[bc]\s+licen/i, weight: -15 }, // Class B/C driving license
  // Skilled trades requiring certification
  { pattern: /\b(welder|electrician|plumber|carpenter)\s+(certified|licensed|required)\b/i, weight: -15 },
  { pattern: /\bsenior\s+(developer|engineer|manager|accountant)\b/i, weight: -10 },
  { pattern: /\b(director|vice\s+president|cfo|cto|ceo)\b/i, weight: -15 },
  { pattern: /\b(engineer|accountant|architect)\s+required\b/i, weight: -12 },
  { pattern: /\blicensed\s+(professional|practitioner)\b/i, weight: -12 },
  { pattern: /\badvanced\s+expertise\b/i, weight: -10 },
];

function scoreJuniorFit(text: string): number {
  let score = 50;
  for (const signal of POSITIVE_SIGNALS) {
    if (signal.pattern.test(text)) score += signal.weight;
  }
  for (const signal of NEGATIVE_SIGNALS) {
    if (signal.pattern.test(text)) score += signal.weight; // weight is negative
  }
  return Math.max(0, Math.min(100, score));
}

function getEnglishStatus(text: string): 'yes' | 'maybe' | 'no' | 'unknown' {
  if (/english\s+(accepted|ok|sufficient|enough|welcome|is\s+enough)/i.test(text)) return 'yes';
  if (/fluent\s+icelandic\s+required/i.test(text)) return 'no';
  if (/english\s+required/i.test(text)) return 'yes';
  return 'unknown';
}

function getIcelandicStatus(text: string): 'yes' | 'no' | 'unknown' {
  if (/fluent\s+icelandic\s+required|íslenska\s+er\s+skylda/i.test(text)) return 'yes';
  if (/no\s+icelandic\s+required|icelandic\s+not\s+required/i.test(text)) return 'no';
  return 'unknown';
}

function makeSummary(
  job: NormalizedJob
): { normalized_summary: string; requirement_summary: string } {
  const lines: string[] = [];
  if (job.title) lines.push(`Stanowisko: ${job.title}`);
  if (job.company) lines.push(`Pracodawca: ${job.company}`);
  if (job.location) lines.push(`Lokalizacja: ${job.location}`);
  if (job.salary_text) lines.push(`Wynagrodzenie: ${job.salary_text}`);
  if (job.employment_type) lines.push(`Typ: ${job.employment_type}`);
  const normalized_summary = lines.join(' | ');

  const reqLines: string[] = [];
  const signals = job.experience_signals_json;
  if (signals?.hasNoExperience) reqLines.push('Brak wymagań dot. doświadczenia');
  if (signals?.hasTraining) reqLines.push('Szkolenie zapewnione');
  if (signals?.yearsRequired) reqLines.push(`Wymagane: ${String(signals.yearsRequired)} lat doświadczenia`);
  if (job.language_requirements) reqLines.push(`Język: ${job.language_requirements}`);
  const requirement_summary = reqLines.join(' | ') || 'Wymagania nieznane';

  return { normalized_summary, requirement_summary };
}

function computePriorityScore(params: {
  housing_status: string;
  junior_fit_score: number;
  pair_score: number;
  english_status: string;
  posted_at: Date | null;
}): number {
  const housingScore =
    params.housing_status === 'yes'
      ? 100
      : params.housing_status === 'maybe'
        ? 60
        : params.housing_status === 'unknown'
          ? 20
          : 0;

  const englishScore =
    params.english_status === 'yes' ? 100 : params.english_status === 'maybe' ? 50 : 20;

  let recencyScore = 50;
  if (params.posted_at) {
    const daysSince = (Date.now() - params.posted_at.getTime()) / (1000 * 60 * 60 * 24);
    recencyScore = Math.max(0, 100 - (daysSince / 14) * 100);
  }

  return Math.round(
    housingScore * 0.35 +
      params.junior_fit_score * 0.25 +
      params.pair_score * 0.2 +
      englishScore * 0.1 +
      recencyScore * 0.1
  );
}

export function scoreJob(job: NormalizedJob): ScoringResult {
  const text = job.raw_description;
  const housing = detectHousing(text);
  const pair = detectPairFriendliness(text);
  const junior_fit_score = scoreJuniorFit(text);
  const english_friendly_status = getEnglishStatus(text);
  const icelandic_required_status = getIcelandicStatus(text);
  const { normalized_summary, requirement_summary } = makeSummary(job);

  const priority_score = computePriorityScore({
    housing_status: housing.housing_status,
    junior_fit_score,
    pair_score: pair.pair_friendliness_score,
    english_status: english_friendly_status,
    posted_at: job.posted_at,
  });

  return {
    junior_fit_score,
    priority_score,
    ...housing,
    ...pair,
    english_friendly_status,
    icelandic_required_status,
    normalized_summary,
    requirement_summary,
  };
}
