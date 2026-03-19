import { z } from 'zod';

export const ProviderNameSchema = z.enum(['alfred', 'island', 'jobs_is', 'storf', 'eures']);
export const HousingStatusSchema = z.enum(['yes', 'maybe', 'no', 'unknown']);
export const PairStatusSchema = z.enum(['yes', 'maybe', 'no', 'unknown']);
export const ReviewStatusSchema = z.enum(['new', 'saved', 'applied', 'rejected']);

export const JobSchema = z.object({
  id: z.string().uuid(),
  dedup_hash: z.string(),
  provider: ProviderNameSchema,
  provider_job_id: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  location: z.string().nullable(),
  job_url: z.string().url(),
  apply_url: z.string().url().nullable(),
  posted_at: z.string().nullable(),
  scraped_at: z.string(),
  employment_type: z.string().nullable(),
  salary_text: z.string().nullable(),
  language_requirements: z.string().nullable(),
  raw_description: z.string().nullable(),
  normalized_summary: z.string().nullable(),
  requirement_summary: z.string().nullable(),
  experience_signals_json: z.record(z.string(), z.unknown()).nullable(),
  housing_status: HousingStatusSchema,
  housing_confidence: z.number().int().min(0).max(100),
  housing_evidence: z.string().nullable(),
  pair_friendliness_status: PairStatusSchema,
  pair_friendliness_score: z.number().int().min(0).max(100),
  pair_friendliness_evidence: z.string().nullable(),
  english_friendly_status: z.enum(['yes', 'maybe', 'no', 'unknown']),
  icelandic_required_status: z.enum(['yes', 'no', 'unknown']),
  junior_fit_score: z.number().int().min(0).max(100),
  priority_score: z.number().int().min(0).max(100),
  review_status: ReviewStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type JobInput = z.infer<typeof JobSchema>;

export const JobFiltersSchema = z.object({
  provider: ProviderNameSchema.or(z.literal('')).optional(),
  status: ReviewStatusSchema.or(z.literal('')).optional(),
  housing: HousingStatusSchema.or(z.literal('')).optional(),
  pair: PairStatusSchema.or(z.literal('')).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type JobFiltersInput = z.infer<typeof JobFiltersSchema>;
