import { z } from 'zod';

export const ContactMethodSchema = z.enum(['email', 'form', 'unknown']);

export const EmployerSchema = z.object({
  id: z.string().uuid(),
  place_id: z.string().nullable(),
  place_name: z.string(),
  category: z.string(),
  region: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  maps_url: z.string().nullable(),
  website_url: z.string().nullable(),
  domain: z.string().nullable(),
  name_slug: z.string().nullable(),
  confidence_score: z.number().int().min(0).max(100),
  best_contact_method: ContactMethodSchema,
  best_email: z.string().email().nullable(),
  email_priority: z.number().int().min(1).max(3).nullable(),
  application_form_url: z.string().nullable(),
  careers_page_url: z.string().nullable(),
  evidence_excerpt: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type EmployerInput = z.infer<typeof EmployerSchema>;

export const EmployerContactSchema = z.object({
  id: z.string().uuid(),
  employer_id: z.string().uuid(),
  email: z.string().email(),
  priority: z.number().int().min(1).max(3),
  source_url: z.string().nullable(),
  found_at: z.string(),
});

export type EmployerContactInput = z.infer<typeof EmployerContactSchema>;

export const EmployerFiltersSchema = z.object({
  category: z.string().optional(),
  region: z.string().optional(),
  hasEmail: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

export type EmployerFiltersInput = z.infer<typeof EmployerFiltersSchema>;
