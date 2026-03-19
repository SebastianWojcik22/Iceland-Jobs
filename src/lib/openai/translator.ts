import OpenAI from 'openai';
import { logger } from '@/lib/utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TranslationResult {
  titlePL: string;
  summaryPL: string;
  requirementsPL: string;
  housingMentioned: boolean;
  languageNote: string;
}

export async function translateJob(
  title: string,
  description: string
): Promise<TranslationResult> {
  const prompt = `Jesteś asystentem pomagającym Polakom znaleźć pracę na Islandii.

Przeanalizuj poniższą ofertę pracy (może być po islandzku lub angielsku) i odpowiedz TYLKO w formacie JSON.

Tytuł: ${title}

Opis:
---
${description.slice(0, 3000)}
---

Odpowiedz w formacie JSON (bez żadnego innego tekstu):
{
  "titlePL": "tytuł stanowiska przetłumaczony na polski",
  "summaryPL": "krótkie podsumowanie oferty po polsku (max 3 zdania): co to za praca, gdzie, co robi pracownik",
  "requirementsPL": "wymagania po polsku w 1-2 zdaniach: doświadczenie, język, wykształcenie - jeśli brak wymagań napisz 'Brak szczególnych wymagań'",
  "housingMentioned": true/false (czy wspomniano zakwaterowanie/mieszkanie dla pracownika),
  "languageNote": "krótka notatka o wymaganiach językowych po polsku, np. 'Wystarczy angielski' lub 'Wymagany islandzki' lub 'Brak wymagań językowych'"
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 500,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as TranslationResult;

  return {
    titlePL: parsed.titlePL ?? title,
    summaryPL: parsed.summaryPL ?? '',
    requirementsPL: parsed.requirementsPL ?? '',
    housingMentioned: parsed.housingMentioned ?? false,
    languageNote: parsed.languageNote ?? '',
  };
}

export async function translateJobsBatch(
  jobs: Array<{ id: string; title: string; raw_description: string }>
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();
  const delayMs = 500; // gpt-4o-mini is fast and cheap

  for (const job of jobs) {
    try {
      const result = await translateJob(job.title, job.raw_description ?? '');
      results.set(job.id, result);
      logger.info(`Translated: ${job.title} → ${result.titlePL}`);
      if (jobs.length > 1) await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      logger.error(`Translation failed for: ${job.title}`, err);
      results.set(job.id, {
        titlePL: job.title,
        summaryPL: '',
        requirementsPL: '',
        housingMentioned: false,
        languageNote: '',
      });
    }
  }

  return results;
}
