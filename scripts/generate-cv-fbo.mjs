import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const photoBase64 = readFileSync('C:/Users/sebas/Desktop/zdjecie CV (2).png').toString('base64');
const photoSrc = `data:image/png;base64,${photoBase64}`;

const html = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8"/>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5pt;color:#1a1a1a;display:flex;min-height:100vh;}

/* SIDEBAR */
.sidebar{width:250px;min-height:100vh;background:#1e2d4a;color:#e8ecf2;padding:36px 22px 36px 22px;flex-shrink:0;}
.photo{width:116px;height:116px;border-radius:50%;object-fit:cover;object-position:center top;display:block;margin:0 auto 20px auto;border:3px solid #3a5272;}
.sidebar-name{font-size:16pt;font-weight:700;color:#fff;text-align:center;line-height:1.25;margin-bottom:5px;}
.sidebar-title{font-size:8pt;color:#f0a04b;text-align:center;font-weight:600;letter-spacing:0.3px;margin-bottom:22px;line-height:1.5;}
.sidebar-contact{margin-bottom:22px;border-bottom:1px solid #2d4063;padding-bottom:18px;}
.sidebar-contact span{display:block;font-size:8pt;color:#c5cfde;margin-bottom:7px;word-break:break-all;}
.s-section-title{font-size:7.5pt;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#f0a04b;border-bottom:1px solid #3a5272;padding-bottom:4px;margin:18px 0 10px 0;}
.s-list{list-style:none;}
.s-list li{font-size:8.5pt;color:#c5cfde;padding:3px 0 3px 12px;position:relative;line-height:1.5;}
.s-list li::before{content:'▸';position:absolute;left:0;color:#f0a04b;font-size:7pt;top:4px;}
.tag-wrap{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px;}
.tag{background:#2d4063;color:#d0daea;font-size:7.5pt;padding:3px 8px;border-radius:3px;line-height:1.4;}
.tag.highlight{background:#f0a04b;color:#1e2d4a;font-weight:700;}
.lang-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
.lang-name{font-size:9pt;color:#e8ecf2;font-weight:600;}
.lang-level{font-size:8pt;color:#a0b0c5;}

/* MAIN */
.main{flex:1;padding:40px 42px 40px 36px;}
.main-name{font-size:23pt;font-weight:800;color:#1e2d4a;letter-spacing:-0.5px;}
.main-title{font-size:10pt;color:#f0a04b;font-weight:600;margin:4px 0 14px 0;}
.divider{border:none;border-top:2px solid #1e2d4a;margin-bottom:18px;}

.section-title{font-size:8pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#1e2d4a;border-bottom:1.5px solid #1e2d4a;padding-bottom:4px;margin:18px 0 11px 0;}
.profile-text{font-size:9.5pt;color:#333;line-height:1.7;}

.callout{background:#f4f7ff;border-left:3px solid #f0a04b;padding:10px 14px;font-size:9pt;color:#333;margin:14px 0 18px 0;line-height:1.6;}

.project{margin-bottom:15px;padding-bottom:13px;border-bottom:1px solid #eee;}
.project:last-of-type{border-bottom:none;}
.project-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px;}
.project-title{font-weight:700;font-size:10pt;color:#1e2d4a;}
.project-date{font-size:8.5pt;color:#777;font-style:italic;white-space:nowrap;padding-left:8px;}
.project-sub{font-size:8.5pt;color:#f0a04b;font-weight:600;margin-bottom:6px;}
.project ul{padding-left:15px;}
.project ul li{font-size:9pt;color:#333;margin-bottom:3px;line-height:1.55;}
.project-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px;}
.ptag{background:#edf0f5;color:#3a5272;font-size:7.5pt;padding:2px 7px;border-radius:2px;}

.strength-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:8px;}
.strength-item{font-size:9pt;color:#333;padding-left:16px;position:relative;line-height:1.55;}
.strength-item::before{content:'✓';position:absolute;left:0;color:#f0a04b;font-weight:700;}

.edu-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
.edu-school{font-weight:700;font-size:9.5pt;color:#1e2d4a;}
.edu-field{font-size:9pt;color:#555;font-style:italic;}
.edu-date{font-size:8.5pt;color:#777;font-style:italic;white-space:nowrap;padding-left:8px;}

.note-box{background:#fffbf0;border:1px solid #e8d5a0;border-radius:4px;padding:11px 14px;font-size:8.5pt;color:#555;line-height:1.6;margin-top:16px;}
</style>
</head>
<body>

<!-- SIDEBAR -->
<div class="sidebar">
  <img class="photo" src="${photoSrc}" alt="Sebastian Wójcik"/>
  <div class="sidebar-name">Sebastian<br/>Wójcik</div>
  <div class="sidebar-title">Junior Product Manager IT<br/>Myślenie produktowe · AI-native</div>

  <div class="sidebar-contact">
    <span>✉ sebastian.wojcik.contact22@gmail.com</span>
    <span>✆ +48 500 270 098</span>
    <span>⌂ Warszawa, Polska</span>
    <span>⌥ github.com/SebastianWojcik22</span>
  </div>

  <div class="s-section-title">PM — zakres i delivery</div>
  <ul class="s-list">
    <li>Definiowanie zakresu i MVP</li>
    <li>Specyfikacje funkcjonalne</li>
    <li>Zarządzanie współpracą z deweloperami</li>
    <li>Analiza wymagań i user stories</li>
    <li>Dokumentacja techniczna</li>
    <li>UX judgment — narzędzia webowe</li>
    <li>Iteracja i feedback post-launch</li>
  </ul>

  <div class="s-section-title">Narzędzia AI (codzienne)</div>
  <div class="tag-wrap">
    <span class="tag highlight">Claude</span>
    <span class="tag highlight">ChatGPT</span>
    <span class="tag highlight">Cursor</span>
    <span class="tag">GPT-4o</span>
    <span class="tag">Claude Code</span>
    <span class="tag">Gemini</span>
    <span class="tag">OpenAI API</span>
    <span class="tag">Anthropic API</span>
    <span class="tag">Google AI Studio</span>
  </div>

  <div class="s-section-title">Zarządzanie projektami</div>
  <div class="tag-wrap">
    <span class="tag">Notion</span>
    <span class="tag">Jira</span>
    <span class="tag">Confluence</span>
    <span class="tag">Trello</span>
    <span class="tag">Linear</span>
    <span class="tag">Agile / Scrum</span>
    <span class="tag">Kanban</span>
    <span class="tag">Miro</span>
  </div>

  <div class="s-section-title">Automatyzacja i dane</div>
  <div class="tag-wrap">
    <span class="tag">Make</span>
    <span class="tag">n8n</span>
    <span class="tag">Zapier</span>
    <span class="tag">Airtable</span>
    <span class="tag">Google Sheets</span>
  </div>

  <div class="s-section-title">API i integracje</div>
  <div class="tag-wrap">
    <span class="tag">Claude API</span>
    <span class="tag">OpenAI API</span>
    <span class="tag">Google Places API</span>
    <span class="tag">Gmail API</span>
    <span class="tag">Supabase</span>
    <span class="tag">Notion API</span>
    <span class="tag">REST API</span>
    <span class="tag">Webhooks</span>
  </div>

  <div class="s-section-title">Tech literacy</div>
  <div class="tag-wrap">
    <span class="tag">TypeScript</span>
    <span class="tag">Node.js</span>
    <span class="tag">Next.js</span>
    <span class="tag">JSON/Zod</span>
    <span class="tag">Git/GitHub</span>
    <span class="tag">Playwright</span>
  </div>

  <div class="s-section-title">Języki</div>
  <div class="lang-row"><span class="lang-name">Polski</span><span class="lang-level">ojczysty</span></div>
  <div class="lang-row"><span class="lang-name">Angielski</span><span class="lang-level">B2/C1 zawodowy</span></div>
</div>

<!-- MAIN CONTENT -->
<div class="main">
  <div class="main-name">Sebastian Wójcik</div>
  <div class="main-title">Product Manager IT · Od specyfikacji do wdrożenia</div>
  <hr class="divider"/>

  <div class="section-title">Profil</div>
  <p class="profile-text">
    Absolwent IT Project Management bez komercyjnego doświadczenia jako PM. Przez własne projekty edukacyjne zetknąłem się praktycznie z cyklem produktowym: myślenie o zakresie i MVP, pisanie wymagań, podejmowanie decyzji technicznych, iterowanie. To projekty uczone — nie wdrożenia komercyjne — ale dały mi realne zrozumienie tego, jak myśleć o produkcie i specyfikacji. Pracuję AI-native — <strong>Claude, ChatGPT i Cursor</strong> to narzędzia których używam codziennie. Niedawno rozpocząłem studia podyplomowe AI for Business na Akademii Koźmińskiego.
  </p>

  <div class="callout">
    Szukam pierwszej roli, w której będę mógł zastosować to myślenie produktowe w prawdziwym kontekście — przy realnych użytkownikach, realnych wymaganiach i realnym feedbacku. Projekty poniżej pokazują, jak myślę, nie czym się chwalę.
  </div>

  <div class="section-title">Projekty własne — nauka przez budowanie</div>

  <div class="project">
    <div class="project-header">
      <div class="project-title">RiseWay3 — Analizator EU AI Act (projekt edukacyjny)</div>
      <div class="project-date">2025</div>
    </div>
    <div class="project-sub">Myślenie o architekturze · specyfikacja modułów · integracja GPT-4o · Notion API</div>
    <ul>
      <li>Projekt uczący: zdefiniowałem zakres i architekturę 3-warstwową — pozyskiwanie regulacji, analiza ryzyka, raportowanie; ćwiczenie myślenia o produkcie od całości do szczegółu</li>
      <li>Pisałem wymagania dla każdego etapu pipeline'u (7 etapów ETL), określałem kontrakty danych między modułami — ćwiczenie specyfikowania</li>
      <li>Podejmowałem decyzje dotyczące UX prostego dashboardu; iterowałem jakość outputu GPT-4o na podstawie weryfikacji z dokumentem źródłowym</li>
    </ul>
    <div class="project-tags">
      <span class="ptag">Specyfikacja</span><span class="ptag">TypeScript</span><span class="ptag">GPT-4o</span><span class="ptag">REST API</span><span class="ptag">Notion API</span><span class="ptag">Claude API</span>
    </div>
  </div>

  <div class="project">
    <div class="project-header">
      <div class="project-title">JobHunter3 — Automatyzacja wyszukiwania pracy (projekt edukacyjny)</div>
      <div class="project-date">2026</div>
    </div>
    <div class="project-sub">Zakres MVP · integracja 4 źródeł danych · GPT-4o scoring · Telegram Bot</div>
    <ul>
      <li>Ćwiczenie definiowania zakresu: co wchodzi do MVP, co odpada; jak podzielić system na moduły z jasnymi odpowiedzialnościami</li>
      <li>Praktyka z kontraktami danych (Zod schemas) i integracją wielu źródeł — 4 portale pracy, różne struktury odpowiedzi</li>
      <li>Zbudowany na własny użytek; nauczyłem się jak GPT-4o radzi sobie z oceną trafności i gdzie jego limity</li>
    </ul>
    <div class="project-tags">
      <span class="ptag">Zakres MVP</span><span class="ptag">Playwright</span><span class="ptag">GPT-4o</span><span class="ptag">Telegram Bot</span><span class="ptag">TypeScript</span><span class="ptag">Supabase</span>
    </div>
  </div>

  <div class="project">
    <div class="project-header">
      <div class="project-title">Iceland Jobs Hunter — Narzędzie do szukania pracy (projekt edukacyjny)</div>
      <div class="project-date">2026</div>
    </div>
    <div class="project-sub">Next.js · Google Places API · Gmail API · Supabase · scoring ofert</div>
    <ul>
      <li>Projekt uczący full-stack: scraping portali pracy, scoring ofert (housing, dopasowanie, junior-fit), discovery pracodawców przez Google Places API</li>
      <li>Praktyka z decyzjami UX dashboardu, kolejkowaniem wysyłki e-mail przez Gmail API i zarządzaniem stanem w Supabase</li>
    </ul>
    <div class="project-tags">
      <span class="ptag">Next.js</span><span class="ptag">Supabase</span><span class="ptag">Google Places API</span><span class="ptag">Gmail API</span><span class="ptag">GPT-4o-mini</span>
    </div>
  </div>

  <div class="project">
    <div class="project-header">
      <div class="project-title">Automatyzacja Workflow — Onboarding Klientów</div>
      <div class="project-date">2026</div>
    </div>
    <div class="project-sub">Make · Airtable · Google Sheets · mapowanie procesu</div>
    <ul>
      <li>Zmapowałem proces onboardingu, zidentyfikowałem kroki które można zautomatyzować i napisałem specyfikację scenariusza Make</li>
      <li>Ćwiczenie przełożenia opisu procesu na logikę automatyzacji z routingiem warunkowym między platformami</li>
    </ul>
    <div class="project-tags">
      <span class="ptag">Mapowanie procesów</span><span class="ptag">Make</span><span class="ptag">Airtable</span><span class="ptag">Google Sheets</span>
    </div>
  </div>

  <div class="section-title">Co potrafię i co rozumiem</div>
  <div class="strength-grid">
    <div class="strength-item">Potrafię przełożyć wizję na specyfikację funkcjonalną — nie ogólniki, konkretne wymagania dla dewelopera</div>
    <div class="strength-item">Rozumiem architekturę techniczną na tyle, by sensownie briefować wykonawcę i oceniać jego pytania</div>
    <div class="strength-item">Pracuję z Claude, ChatGPT i Cursorem na co dzień — do prototypowania, walidacji pomysłów i dokumentowania</div>
    <div class="strength-item">Wiem, jak myśleć o UX narzędzi webowych — co jest potrzebne użytkownikowi, co jest zbędne</div>
    <div class="strength-item">Potrafię pisać dokumentację techniczną i procesową zrozumiałą zarówno dla dewelopera, jak i biznesu</div>
    <div class="strength-item">Uczę się szybko i otwarcie mówię, gdy czegoś nie wiem — nie udaję doświadczenia, którego nie mam</div>
  </div>

  <div class="section-title">Wykształcenie</div>
  <div class="edu-row">
    <div><span class="edu-school">Akademia Leona Koźmińskiego, Warszawa</span> <span class="edu-field">— Studia podyplomowe, AI for Business (rozpoczęte)</span></div>
    <div class="edu-date">2026 – obecnie</div>
  </div>
  <div class="edu-row">
    <div><span class="edu-school">Collegium Da Vinci, Poznań</span> <span class="edu-field">— Licencjat, IT Project Management</span></div>
    <div class="edu-date">2022 – 2025</div>
  </div>

  <div class="note-box">
    <strong>Uczciwie o doświadczeniu:</strong> Nie mam 3 lat komercyjnego stażu jako PM i nie mam wdrożeń dla klientów. Projekty w portfolio to projekty edukacyjne — budowane żeby się nauczyć, nie żeby komuś dostarczyć. Jeśli szukasz kogoś z udowodnionym doświadczeniem w produkcie komercyjnym — raczej nie pasuję. Jeśli zależy Ci na kimś z właściwym myśleniem, kto szybko się uczy i pracuje z AI na co dzień — warto porozmawiać.
  </div>
</div>

</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1100, height: 1600 });
await page.setContent(html, { waitUntil: 'load' });
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '0', bottom: '0', left: '0', right: '0' },
});
await browser.close();
writeFileSync('C:/Users/sebas/Desktop/Sebastian_Wojcik_CV_FBO.pdf', pdf);
console.log('CV saved: Sebastian_Wojcik_CV_FBO.pdf');
