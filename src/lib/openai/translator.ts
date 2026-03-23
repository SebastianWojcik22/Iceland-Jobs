import OpenAI from 'openai';
import { logger } from '@/lib/utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface TranslationResult {
  titlePL: string;
  summaryPL: string;
  requirementsPL: string;
  housingMentioned: boolean;
  languageNote: string;
  icelandicRequired: boolean;
  kennitalRequired: boolean;
}

export async function translateJob(
  title: string,
  description: string
): Promise<TranslationResult> {
  const prompt = `Jesteś asystentem pomagającym Polakom znaleźć pracę na Islandii. Analizujesz oferty pracy (islandzki lub angielski) i odpowiadasz TYLKO w JSON.

WAŻNE: Czytaj DOKŁADNIE cały tekst oferty. Szukaj wszelkich wymagań: licencji, uprawnień, certyfikatów, umiejętności technicznych, języków, doświadczenia. NIE pisz "Brak wymagań" jeśli są jakiekolwiek wymagania.

Tytuł: ${title}

Opis:
---
${description.slice(0, 3500)}
---

Odpowiedz w formacie JSON (bez żadnego innego tekstu):
{
  "titlePL": "tytuł stanowiska przetłumaczony na polski",
  "summaryPL": "podsumowanie oferty po polsku (2-3 zdania): co to za praca, gdzie, główne obowiązki",
  "requirementsPL": "WSZYSTKIE wymagania po polsku - wymień każde z osobna: licencje/uprawnienia, wykształcenie, doświadczenie, języki, certyfikaty, umiejętności specjalne. Jeśli naprawdę nie ma żadnych wymagań, napisz 'Brak szczególnych wymagań'",
  "housingMentioned": true/false (czy wspomniano zakwaterowanie/nocleg dla pracownika),
  "languageNote": "wymagania językowe po polsku, np. 'Wymagany angielski, islandzki opcjonalny' lub 'Wymagany islandzki' lub 'Wystarczy angielski'",
  "icelandicRequired": true/false (true TYLKO jeśli islandzki jest WYMAGANY - nie opcjonalny),
  "kennitalRequired": true/false (true jeśli wymagana kennitala, islandzki e-ID, auðkenni lub islandzki numer identyfikacyjny)
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
    icelandicRequired: parsed.icelandicRequired ?? false,
    kennitalRequired: parsed.kennitalRequired ?? false,
  };
}

export async function translateJobsBatch(
  jobs: Array<{ id: string; title: string; raw_description: string }>
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();
  const CONCURRENCY = 5;

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async job => {
        try {
          const result = await translateJob(job.title, job.raw_description ?? '');
          results.set(job.id, result);
          logger.info(`Translated: ${job.title} → ${result.titlePL}`);
        } catch (err) {
          logger.error(`Translation failed for: ${job.title}`, err);
          results.set(job.id, {
            titlePL: job.title,
            summaryPL: '',
            requirementsPL: '',
            housingMentioned: false,
            languageNote: '',
            icelandicRequired: false,
            kennitalRequired: false,
          });
        }
      })
    );
  }

  return results;
}
