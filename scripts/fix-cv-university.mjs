import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

// Fix university name in all CVs by re-rendering the HTML with corrected text
// Since we don't have source HTML for PM/Developer/Automation, we use pdf text extraction
// and overlay approach via a regeneration script

const PHOTO_PATH = 'C:/Users/sebas/Desktop/zdjecie CV (2).png';
const photoBase64 = readFileSync(PHOTO_PATH).toString('base64');
const photoSrc = `data:image/png;base64,${photoBase64}`;

const SIDEBAR_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; min-height: 100vh; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; }
  .sidebar {
    width: 195px; min-height: 100vh; background: #1e2d4e; color: #ccd6f6;
    padding: 24px 16px; flex-shrink: 0; display: flex; flex-direction: column; gap: 0;
  }
  .photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; object-position: center top; display: block; margin: 0 auto 14px; border: 2px solid #4a90d9; }
  .s-name { color: #fff; font-size: 15pt; font-weight: 700; text-align: center; line-height: 1.2; margin-bottom: 4px; }
  .s-role { color: #f0a500; font-size: 8pt; font-weight: 600; text-align: center; margin-bottom: 3px; }
  .s-sub { color: #8892b0; font-size: 7.5pt; text-align: center; margin-bottom: 14px; }
  .s-section-title { color: #8892b0; font-size: 6.5pt; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; border-bottom: 1px solid #2d4070; padding-bottom: 3px; margin: 10px 0 6px; }
  .tag-wrap { display: flex; flex-wrap: wrap; gap: 3px; }
  .tag { background: #2d4070; color: #ccd6f6; font-size: 7pt; padding: 2px 5px; border-radius: 3px; }
  .lang-row { display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 3px; }
  .lang-name { color: #ccd6f6; }
  .lang-level { color: #8892b0; }
  .main { flex: 1; padding: 28px 32px; background: #fff; }
  .main-name { font-size: 22pt; font-weight: 700; color: #1e2d4e; }
  .main-title { font-size: 9pt; color: #f0a500; font-weight: 600; margin-bottom: 2px; }
  hr.divider { border: none; border-top: 2px solid #1e2d4e; margin: 8px 0 14px; }
  .section-title { font-size: 7pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #1e2d4e; border-bottom: 1px solid #d0d8e8; padding-bottom: 2px; margin: 14px 0 8px; }
  .profile-text { font-size: 9pt; color: #333; line-height: 1.55; }
  .callout { background: #f8f4e8; border-left: 3px solid #f0a500; padding: 7px 12px; font-size: 8.5pt; color: #555; margin: 10px 0 14px; font-style: italic; }
  .project { margin-bottom: 12px; }
  .project-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .project-title { font-weight: 700; font-size: 9.5pt; color: #1e2d4e; }
  .project-date { font-size: 8pt; color: #888; white-space: nowrap; padding-left: 10px; }
  .project-sub { font-size: 8pt; color: #f0a500; margin: 1px 0 4px; font-weight: 600; }
  .project ul { padding-left: 14px; }
  .project ul li { font-size: 8.5pt; color: #333; margin-bottom: 2px; line-height: 1.4; }
  .ptag { display: inline-block; background: #eef2f8; color: #1e2d4e; font-size: 7pt; padding: 2px 6px; border-radius: 3px; margin: 2px 2px 0 0; }
  .project-tags { margin-top: 5px; }
  .strength-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .strength-item { font-size: 8.5pt; color: #333; background: #f5f7fb; padding: 6px 8px; border-radius: 4px; border-left: 2px solid #4a90d9; }
  .edu-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .edu-school { font-weight: 700; font-size: 9.5pt; color: #1e2d4e; }
  .edu-field { font-size: 8.5pt; color: #555; font-style: italic; }
  .edu-date { font-size: 8pt; color: #888; white-space: nowrap; padding-left: 10px; }
  .note-box { background: #fef9f0; border: 1px solid #f0a500; border-radius: 4px; padding: 10px 14px; font-size: 8.5pt; color: #555; margin-top: 14px; line-height: 1.5; }
  a { color: #4a90d9; text-decoration: none; font-size: 7.5pt; }
`;

const cvs = [
  {
    filename: 'Sebastian_Wojcik_CV_PM.pdf',
    html: (p) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${SIDEBAR_CSS}</style></head><body>
<div class="sidebar">
  <img class="photo" src="${p}" />
  <div class="s-name">Sebastian<br/>Wójcik</div>
  <div class="s-role">Junior IT Project Manager</div>
  <div class="s-sub">AI Tools · Process Automation</div>
  <div class="s-section-title">Core Focus</div>
  <div style="font-size:8pt;color:#ccd6f6;line-height:1.7">
    ▸ Project coordination & delivery<br/>
    ▸ Requirements analysis & process design<br/>
    ▸ Workflow & process automation<br/>
    ▸ AI tools for project work<br/>
    ▸ Technical documentation<br/>
    ▸ Stakeholder communication
  </div>
  <div class="s-section-title">AI Tools</div>
  <div class="tag-wrap"><span class="tag">Claude</span><span class="tag">ChatGPT</span><span class="tag">Notion AI</span><span class="tag">Copilot</span><span class="tag">OpenAI API</span><span class="tag">GPT-4o</span><span class="tag">Make</span><span class="tag">Cursor</span></div>
  <div class="s-section-title">No-Code / Low-Code</div>
  <div class="tag-wrap"><span class="tag">Make</span><span class="tag">Zapier</span><span class="tag">n8n</span><span class="tag">Bubble</span><span class="tag">Airtable</span><span class="tag">Notion</span><span class="tag">Google Sheets</span><span class="tag">Webflow</span></div>
  <div class="s-section-title">Languages</div>
  <div class="lang-row"><span class="lang-name">Polish</span><span class="lang-level">native</span></div>
  <div class="lang-row"><span class="lang-name">English</span><span class="lang-level">B2/C1</span></div>
</div>
<div class="main">
  <div class="main-name">Sebastian Wójcik</div>
  <div class="main-title">Junior IT Project Manager · AI-enabled Delivery · Process Automation</div>
  <hr class="divider"/>
  <p class="profile-text">IT Project Management graduate combining PM methodology with practical experience in workflow automation and AI-assisted tool delivery. Gathers requirements, maps processes, writes technical documentation, and coordinates end-to-end delivery. Also able to prototype and build internal tools using AI-assisted development (Claude Code, ChatGPT, Make, n8n) — which enables faster requirements validation, better communication with developers, and reduced dependency on external resources. Currently completing postgraduate studies in AI for Business at Kozminski University.</p>
  <div class="section-title">Education</div>
  <div class="edu-row">
    <div><span class="edu-school">Kozminski University, Warsaw</span> <span class="edu-field">— Postgraduate Studies, AI for Business</span></div>
    <div class="edu-date">2026 – present</div>
  </div>
  <div class="edu-row">
    <div><span class="edu-school">Collegium Da Vinci, Poznań</span> <span class="edu-field">— Bachelor's Degree, IT Project Management</span></div>
    <div class="edu-date">2022 – 2025</div>
  </div>
  <div class="section-title">Projects</div>
  <div class="project">
    <div class="project-header"><div class="project-title">RiseWay3 — EU AI Act Compliance Intelligence System</div><div class="project-date">2025</div></div>
    <div class="project-sub">Full project scope & architecture · 3-layer delivery · dashboard for stakeholders · audit trail</div>
    <ul><li>Defined the full project scope and architecture for a 3-layer compliance intelligence system — from regulatory ingestion (Layer 1) through project risk analysis (Layer 2) to executive reporting (Layer 3)</li><li>Managed multi-stage delivery: a 7-stage automated pipeline producing a structured 113-article dataset, a gap analysis and risk scoring module for AI projects, and an executive translation layer generating board-level summaries without legal jargon</li><li>Delivered a REST API dashboard for stakeholder access and an audit trail for compliance reporting</li></ul>
    <div class="project-tags"><span class="ptag">Scope definition</span><span class="ptag">Architecture design</span><span class="ptag">Multi-stage delivery</span><span class="ptag">Technical docs</span><span class="ptag">Stakeholder dashboard</span><span class="ptag">TypeScript</span><span class="ptag">GPT-4o</span></div>
    <a href="https://github.com/SebastianWojcik22/riseway3">github.com/SebastianWojcik22/riseway3</a>
  </div>
  <div class="project">
    <div class="project-header"><div class="project-title">JobHunter3 — Automated Job Search & Application System</div><div class="project-date">2026</div></div>
    <div class="project-sub">Scope definition · 4 data sources · modular delivery · notification & apply workflow</div>
    <ul><li>Defined the full scope for a job search automation system integrating 4 data sources (Pracuj.pl, NoFluffJobs, JustJoinIT, OLX). Structured delivery into modular components: data collection (Playwright), relevance scoring (GPT-4o), scheduling (node-cron), and delivery (Telegram Bot with one-click apply)</li><li>Managed requirements and architecture across 10+ TypeScript modules, with Zod schema validation enforcing data contracts between components</li></ul>
    <div class="project-tags"><span class="ptag">Scope definition</span><span class="ptag">Modular delivery</span><span class="ptag">Playwright</span><span class="ptag">GPT-4o</span><span class="ptag">Telegram Bot</span><span class="ptag">TypeScript</span></div>
    <a href="https://github.com/SebastianWojcik22/jobhunter3">github.com/SebastianWojcik22/jobhunter3</a>
  </div>
  <div class="project">
    <div class="project-header"><div class="project-title">Automation Workflow — Client Onboarding Process</div><div class="project-date">2026</div></div>
    <div class="project-sub">Process mapping · Make · Airtable · Google Sheets · Zero manual handling</div>
    <ul><li>Identified process inefficiencies in a client onboarding workflow, mapped the full current-state process, and delivered zero-touch automation using Make, Airtable, and Google Sheets</li><li>Defined automation requirements, designed the multi-step scenario logic, implemented conditional data routing across platforms, and documented the outcome for handover</li></ul>
    <div class="project-tags"><span class="ptag">Process mapping</span><span class="ptag">Requirements</span><span class="ptag">Make</span><span class="ptag">Airtable</span><span class="ptag">Google Sheets</span><span class="ptag">Documentation</span></div>
  </div>
  <div class="section-title">What I Bring</div>
  <div class="strength-grid">
    <div class="strength-item"><strong>PM methodology applied to real delivery.</strong> Every project was managed with defined scope, clear requirements, and outcomes tracked.</div>
    <div class="strength-item"><strong>Technical literacy as a PM differentiator.</strong> Can work with automation tools and understand technical architecture well enough to communicate meaningfully with developers.</div>
    <div class="strength-item"><strong>AI-native working style.</strong> Uses Claude, ChatGPT and Cursor daily for planning, documentation, and process design.</div>
    <div class="strength-item"><strong>Ability to deliver without supervision.</strong> All projects were self-directed from requirements through deployment.</div>
  </div>
  <div class="note-box"><strong>A note on experience:</strong> My project management competencies are demonstrated through real delivery, not academic exercises. Each project in this portfolio was managed and executed independently — scope definition, tool selection, risk management, and outcome documentation.</div>
</div>
</body></html>`
  },
  {
    filename: 'Sebastian_Wojcik_CV_Automation.pdf',
    html: (p) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${SIDEBAR_CSS}</style></head><body>
<div class="sidebar">
  <img class="photo" src="${p}" />
  <div class="s-name">Sebastian<br/>Wójcik</div>
  <div class="s-role">Automation Specialist</div>
  <div class="s-sub">AI Integration · Workflow Design</div>
  <div class="s-section-title">Core Focus</div>
  <div style="font-size:8pt;color:#ccd6f6;line-height:1.7">
    ▸ Workflow & process automation<br/>
    ▸ Multi-platform API integrations<br/>
    ▸ No-code / low-code (Make, n8n, Zapier)<br/>
    ▸ Headless browser automation (Playwright)<br/>
    ▸ Scheduled & event-driven systems<br/>
    ▸ AI-enhanced automation workflows
  </div>
  <div class="s-section-title">Automation Stack</div>
  <div class="tag-wrap"><span class="tag">Make</span><span class="tag">Zapier</span><span class="tag">n8n</span><span class="tag">Playwright</span><span class="tag">Puppeteer</span><span class="tag">Webhooks</span><span class="tag">node-cron</span><span class="tag">Telegram Bot</span><span class="tag">Slack API</span></div>
  <div class="s-section-title">No-Code / Low-Code</div>
  <div class="tag-wrap"><span class="tag">Make</span><span class="tag">Bubble</span><span class="tag">Airtable</span><span class="tag">Notion</span><span class="tag">Google Sheets</span><span class="tag">Webflow</span><span class="tag">Zapier</span><span class="tag">n8n</span></div>
  <div class="s-section-title">Languages</div>
  <div class="lang-row"><span class="lang-name">Polish</span><span class="lang-level">native</span></div>
  <div class="lang-row"><span class="lang-name">English</span><span class="lang-level">B2/C1</span></div>
</div>
<div class="main">
  <div class="main-name">Sebastian Wójcik</div>
  <div class="main-title">Automation Specialist · AI-powered Workflows · API & Systems Integration</div>
  <hr class="divider"/>
  <p class="profile-text">IT Project Management graduate specialising in workflow automation, multi-platform integrations, and AI-powered process design. Designs and delivers end-to-end automation systems combining no-code platforms (Make, n8n, Zapier), AI-assisted scripting (TypeScript/Node.js via Claude Code), headless browser automation (Playwright), and LLM logic (GPT-4o). Approaches every process as an automation problem — designing systems that run unattended and eliminate manual steps.</p>
  <div class="section-title">Education</div>
  <div class="edu-row">
    <div><span class="edu-school">Kozminski University, Warsaw</span> <span class="edu-field">— Postgraduate Studies, AI for Business</span></div>
    <div class="edu-date">2026 – present</div>
  </div>
  <div class="edu-row">
    <div><span class="edu-school">Collegium Da Vinci, Poznań</span> <span class="edu-field">— Bachelor's Degree, IT Project Management</span></div>
    <div class="edu-date">2022 – 2025</div>
  </div>
  <div class="section-title">Projects</div>
  <div class="project">
    <div class="project-header"><div class="project-title">JobHunter3 — End-to-end Job Search Automation System</div><div class="project-date">2026</div></div>
    <div class="project-sub">Playwright headless automation · 4 portals · Telegram Bot · node-cron · fully unattended</div>
    <ul><li>Designed and built an end-to-end automation system for job searching across 4 Polish portals. Playwright headless browser automation handles multi-portal scraping with anti-detection measures</li><li>GPT-4o provides semantic relevance scoring per listing. node-cron runs scheduled collection cycles unattended, and a Telegram Bot delivers matched listings with a one-click apply workflow — eliminating all manual steps from discovery to application trigger</li></ul>
    <div class="project-tags"><span class="ptag">Playwright</span><span class="ptag">TypeScript</span><span class="ptag">GPT-4o</span><span class="ptag">node-cron</span><span class="ptag">Telegram Bot</span><span class="ptag">Multi-portal scraping</span></div>
  </div>
  <div class="project">
    <div class="project-header"><div class="project-title">RiseWay3 — EU AI Act Compliance Intelligence System</div><div class="project-date">2025</div></div>
    <div class="project-sub">7-stage automated pipeline · scheduled runs · SHA-256 change detection · unattended operation</div>
    <ul><li>Built a 7-stage automated pipeline that fetches, parses, enriches, and syncs 113 EU AI Act articles to Notion — running unattended with resume logic for interrupted stages</li><li>Implemented SHA-256 article-level diff for regulatory change detection with webhook-triggered alerts. node-cron handles scheduled pipeline runs; error isolation ensures partial failures don't halt the full run</li></ul>
    <div class="project-tags"><span class="ptag">TypeScript</span><span class="ptag">node-cron</span><span class="ptag">Webhooks</span><span class="ptag">SHA-256 diff</span><span class="ptag">Notion API</span><span class="ptag">ETL Pipeline</span><span class="ptag">REST API</span></div>
  </div>
  <div class="project">
    <div class="project-header"><div class="project-title">Automation Workflow — Client Onboarding Process</div><div class="project-date">2026</div></div>
    <div class="project-sub">Make · Airtable · Google Sheets · Zero manual handling</div>
    <ul><li>Identified manual bottlenecks in a client onboarding process, mapped the full workflow, and delivered end-to-end automation using Make, Airtable, and Google Sheets</li><li>Multi-step scenario handles data routing, conditional logic, notifications, and record creation across platforms — reducing manual handling to zero</li></ul>
    <div class="project-tags"><span class="ptag">Make</span><span class="ptag">Airtable</span><span class="ptag">Google Sheets</span><span class="ptag">Process mapping</span><span class="ptag">Workflow automation</span></div>
  </div>
  <div class="note-box"><strong>A note on experience:</strong> All automation systems featured above were self-initiated and delivered independently. I defined the process, designed the integration logic, used AI-assisted tools to accelerate implementation, and validated outcomes until each system ran without manual intervention.</div>
</div>
</body></html>`
  },
  {
    filename: 'Sebastian_Wojcik_CV_Developer.pdf',
    html: (p) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${SIDEBAR_CSS}</style></head><body>
<div class="sidebar">
  <img class="photo" src="${p}" />
  <div class="s-name">Sebastian<br/>Wójcik</div>
  <div class="s-role">AI Solutions Builder</div>
  <div class="s-sub">LLM Integration · Workflow Automation</div>
  <div class="s-section-title">Core Focus</div>
  <div style="font-size:8pt;color:#ccd6f6;line-height:1.7">
    ▸ AI-assisted coding<br/>
    ▸ TypeScript / Node.js development<br/>
    ▸ LLM integration & prompt engineering<br/>
    ▸ REST API design & consumption<br/>
    ▸ Modular backend architecture<br/>
    ▸ Automated data pipelines
  </div>
  <div class="s-section-title">AI Tools</div>
  <div class="tag-wrap"><span class="tag">Claude Code</span><span class="tag">ChatGPT</span><span class="tag">OpenAI API</span><span class="tag">GPT-4o</span><span class="tag">Cursor</span><span class="tag">Claude</span><span class="tag">LangChain</span></div>
  <div class="s-section-title">No-Code / Low-Code</div>
  <div class="tag-wrap"><span class="tag">Make</span><span class="tag">Zapier</span><span class="tag">Bubble</span><span class="tag">Airtable</span><span class="tag">Notion</span><span class="tag">Google Sheets</span><span class="tag">n8n</span></div>
  <div class="s-section-title">Languages</div>
  <div class="lang-row"><span class="lang-name">Polish</span><span class="lang-level">native</span></div>
  <div class="lang-row"><span class="lang-name">English</span><span class="lang-level">B2/C1</span></div>
</div>
<div class="main">
  <div class="main-name">Sebastian Wójcik</div>
  <div class="main-title">AI Solutions Builder · LLM Integration · Workflow Automation</div>
  <hr class="divider"/>
  <p class="profile-text">IT Project Management graduate who designs, orchestrates, and ships working tools using AI-assisted development. Focuses on solution architecture, workflow logic, LLM integration (GPT-4o, Claude), and end-to-end delivery — leveraging Claude Code, ChatGPT, and Cursor to accelerate implementation. Not a traditional software engineer: works at the intersection of product thinking, automation design, and AI tooling to bring ideas from requirements to working MVP.</p>
  <div class="section-title">Education</div>
  <div class="edu-row">
    <div><span class="edu-school">Kozminski University, Warsaw</span> <span class="edu-field">— Postgraduate Studies, AI for Business</span></div>
    <div class="edu-date">2026 – present</div>
  </div>
  <div class="edu-row">
    <div><span class="edu-school">Collegium Da Vinci, Poznań</span> <span class="edu-field">— Bachelor's Degree, IT Project Management</span></div>
    <div class="edu-date">2022 – 2025</div>
  </div>
  <div class="section-title">Projects</div>
  <div class="project">
    <div class="project-header"><div class="project-title">RiseWay3 — EU AI Act Compliance Intelligence System</div><div class="project-date">2025</div></div>
    <div class="project-sub">7-stage TypeScript ETL pipeline · GPT-4o integration · REST API · Notion sync</div>
    <ul><li>Built a 7-stage TypeScript ETL pipeline processing all 113 articles of the EU AI Act — fetching EUR-Lex HTML, parsing structured records, enriching with GPT-4o summaries and compliance classifications, and syncing to Notion</li><li>Designed anti-hallucination prompt chains that inject full article text between delimiters. Implemented Zod runtime validation at every stage boundary, resume logic for interrupted runs, and a modular 3-layer architecture</li></ul>
    <div class="project-tags"><span class="ptag">TypeScript</span><span class="ptag">Node.js</span><span class="ptag">GPT-4o</span><span class="ptag">Zod</span><span class="ptag">REST API</span><span class="ptag">ETL Pipeline</span><span class="ptag">Notion API</span><span class="ptag">Prompt Engineering</span></div>
  </div>
  <div class="project">
    <div class="project-header"><div class="project-title">JobHunter3 — Automated Job Search & Application System</div><div class="project-date">2026</div></div>
    <div class="project-sub">10+ TypeScript module system · Playwright automation · GPT-4o semantic matching · Zod validation</div>
    <ul><li>Architected a 10+ module TypeScript system that automates job searching across 4 Polish portals. Used Playwright for headless browser automation, GPT-4o for semantic relevance scoring</li><li>Implemented cost-controlled batching to manage OpenAI API spend, node-cron for scheduled runs, and a Telegram Bot for one-click apply notifications — enabling fully unattended execution</li></ul>
    <div class="project-tags"><span class="ptag">TypeScript</span><span class="ptag">Playwright</span><span class="ptag">GPT-4o</span><span class="ptag">Zod</span><span class="ptag">node-cron</span><span class="ptag">Telegram Bot</span><span class="ptag">Modular Architecture</span></div>
  </div>
  <div class="note-box"><strong>A note on my working model:</strong> I build software using AI-assisted development — tools like Claude Code, ChatGPT, and Cursor handle implementation acceleration, while I focus on solution design, workflow logic, integration architecture, testing, and delivery. All projects on GitHub are fully functional and self-initiated.</div>
</div>
</body></html>`
  }
];

async function generate() {
  const browser = await chromium.launch();
  for (const cv of cvs) {
    const page = await browser.newPage();
    await page.setContent(cv.html(photoSrc), { waitUntil: 'load' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    const outPath = `C:/Users/sebas/Desktop/${cv.filename}`;
    writeFileSync(outPath, pdf);
    console.log(`✓ ${cv.filename}`);
    await page.close();
  }
  await browser.close();
  console.log('Done — all 3 PDFs saved to Desktop');
}

generate().catch(console.error);
