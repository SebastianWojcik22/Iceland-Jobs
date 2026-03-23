import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';

const photoBase64 = readFileSync('C:/Users/sebas/Desktop/zdjecie CV (2).png').toString('base64');
const photoSrc = `data:image/png;base64,${photoBase64}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, serif;
      font-size: 10.5pt;
      color: #1a1a1a;
      background: #fff;
      padding: 32px 44px 32px 44px;
      line-height: 1.55;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 20px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 16px;
    }
    .photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid #ddd;
    }
    .header-text h1 { font-size: 20pt; font-weight: bold; }
    .header-text .title { font-size: 10pt; color: #444; margin-top: 3px; font-style: italic; }
    .contact-row { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 7px; font-size: 9.5pt; color: #333; }
    .section { margin-bottom: 16px; }
    .section-title {
      font-size: 8.5pt; font-weight: bold; letter-spacing: 1.5px;
      text-transform: uppercase; border-bottom: 1px solid #bbb;
      padding-bottom: 3px; margin-bottom: 9px;
    }
    .summary { font-size: 10pt; color: #333; }
    .highlight-box {
      background: #f5f5f5; border-left: 3px solid #1a1a1a;
      padding: 7px 12px; font-size: 10pt; color: #333; margin-bottom: 16px;
    }
    .job { margin-bottom: 12px; }
    .job-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .job-title { font-weight: bold; font-size: 10.5pt; }
    .job-company { font-size: 10pt; color: #333; margin-top: 1px; }
    .job-date { font-size: 9.5pt; color: #555; white-space: nowrap; font-style: italic; padding-left: 10px; }
    .job ul { margin-top: 5px; padding-left: 16px; }
    .job ul li { font-size: 10pt; color: #333; margin-bottom: 2px; }
    .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 28px; }
    .skill-item { font-size: 10pt; color: #333; }
    .skill-item strong { color: #1a1a1a; }
    .edu-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .edu-school { font-weight: bold; font-size: 10.5pt; }
    .edu-sub { font-size: 10pt; color: #444; font-style: italic; }
    .edu-date { font-size: 9.5pt; color: #555; font-style: italic; white-space: nowrap; padding-left: 10px; }
    .cert-row { font-size: 10pt; color: #333; margin-bottom: 3px; }
  </style>
</head>
<body>

  <div class="header">
    <img class="photo" src="${photoSrc}" alt="Sebastian Wojcik" />
    <div class="header-text">
      <h1>Sebastian Wójcik</h1>
      <div class="title">Seasonal Hotel Work — Iceland Application</div>
      <div class="contact-row">
        <span>+48 500 270 098</span>
        <span>sebastian.wojcik.contact22@gmail.com</span>
        <span>Szczecin / Gorzów Wlkp., Poland</span>
        <span>Available for immediate relocation to Iceland</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Profile</div>
    <div class="summary">
      Motivated and reliable individual with hands-on experience in manufacturing and construction, comfortable with early morning shifts, physical tasks, and following strict hygiene and safety procedures. Seeking a seasonal hotel role in Iceland — breakfast service, kitchen support, or housekeeping. Available for an immediate start and fully open to relocation. Certified in first aid.
    </div>
  </div>

  <div class="highlight-box">
    Available from April 2026 &nbsp;|&nbsp; Open to relocation to Iceland &nbsp;|&nbsp; Open to staff accommodation &nbsp;|&nbsp; Early morning shifts (05:00) are not a problem
  </div>

  <div class="section">
    <div class="section-title">Work Experience</div>

    <div class="job">
      <div class="job-header">
        <div>
          <div class="job-title">Production Worker — Glass Processing</div>
          <div class="job-company">Wolfglass, Grzymiradz (near Debno), Poland</div>
        </div>
        <div class="job-date">January 2023 – December 2023</div>
      </div>
      <ul>
        <li>Operated glass cutting, grinding and processing machinery in a structured production environment</li>
        <li>Followed strict quality control, hygiene and safety protocols (ISO standards) throughout every shift</li>
        <li>Worked rotating shift patterns including early morning starts (05:00–13:00)</li>
        <li>Collaborated reliably within a team to meet daily production targets under time pressure</li>
        <li>Maintained cleanliness and organisation of workstation and shared production areas</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-header">
        <div>
          <div class="job-title">Construction Worker (Bauhelfer)</div>
          <div class="job-company">Richter Bau &amp; Renovierung GmbH, Berlin, Germany</div>
        </div>
        <div class="job-date">March 2020 – August 2020</div>
      </div>
      <ul>
        <li>Assisted with interior renovation and refurbishment projects across Berlin</li>
        <li>Transported materials, prepared surfaces and maintained cleanliness on active sites</li>
        <li>Worked within a multilingual international team — daily communication in English and basic German</li>
        <li>Demonstrated adaptability and reliability in a physically demanding, fast-changing environment</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-header">
        <div>
          <div class="job-title">Bricklayer / Masonry Worker</div>
          <div class="job-company">Bauwerk GmbH, Berlin, Germany</div>
        </div>
        <div class="job-date">April 2021 – October 2021</div>
      </div>
      <ul>
        <li>Laid bricks, blocks and stone for residential and commercial construction projects across Berlin</li>
        <li>Mixed mortar, prepared surfaces and ensured structural alignment to specification</li>
        <li>Followed site safety regulations and worked closely with foremen and other tradespeople</li>
        <li>Maintained a clean and organised worksite throughout the project lifecycle</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-header">
        <div>
          <div class="job-title">Kitchen Assistant</div>
          <div class="job-company">Restauracja Pod Roza, Szczecin, Poland</div>
        </div>
        <div class="job-date">June 2019 – September 2019</div>
      </div>
      <ul>
        <li>Assisted kitchen staff during breakfast and lunch service in a busy restaurant environment</li>
        <li>Set up and replenished buffet items; maintained food presentation and hygiene standards</li>
        <li>Stored and handled food in accordance with HACCP hygiene requirements</li>
        <li>Demonstrated consistent punctuality on early shifts starting at 06:00</li>
      </ul>
    </div>

    <div class="job">
      <div class="job-header">
        <div>
          <div class="job-title">Room Attendant / Cleaning Staff (Seasonal)</div>
          <div class="job-company">Hostel Mundo, Szczecin, Poland</div>
        </div>
        <div class="job-date">June 2022 – August 2022</div>
      </div>
      <ul>
        <li>Cleaned and prepared guest rooms, bathrooms and common areas to a high standard</li>
        <li>Followed room turnover procedures efficiently under time pressure</li>
        <li>Communicated with international guests in English, handling queries professionally</li>
      </ul>
    </div>

  </div>

  <div class="section">
    <div class="section-title">Education</div>
    <div class="edu-row">
      <div>
        <span class="edu-school">Collegium Da Vinci, Poznan</span>
        <span class="edu-sub"> — Bachelor's Degree, IT Project Management</span>
      </div>
      <div class="edu-date">2022 – 2025</div>
    </div>
    <div class="edu-row">
      <div>
        <span class="edu-school">Kozminski University, Warsaw</span>
        <span class="edu-sub"> — Postgraduate Studies, AI for Business</span>
      </div>
      <div class="edu-date">2026 – present</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Certifications</div>
    <div class="cert-row"><strong>First Aid Certificate</strong> — certified in emergency first aid procedures</div>
    <div class="cert-row"><strong>Driver's Licence</strong> — Category B</div>
    <div class="cert-row"><strong>HACCP Awareness</strong> — food hygiene and safety handling (on the job training)</div>
  </div>

  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-grid">
      <div class="skill-item"><strong>Languages:</strong> Polish (native), English (B2/C1), German (basic)</div>
      <div class="skill-item"><strong>Shifts:</strong> Early morning starts (05:00) — experienced</div>
      <div class="skill-item"><strong>Physical fitness:</strong> Comfortable with manual and physical work</div>
      <div class="skill-item"><strong>Food &amp; hygiene:</strong> HACCP awareness, safe food storage</div>
      <div class="skill-item"><strong>Teamwork:</strong> International, multilingual team environments</div>
      <div class="skill-item"><strong>Guest service:</strong> Friendly and professional attitude</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Additional</div>
    <div class="summary">
      Fully available for relocation to Iceland from April 2026. Open to staff accommodation. Comfortable taking on any role needed within hotel operations — breakfast service, kitchen support, or housekeeping. References available on request.
    </div>
  </div>

</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '0', right: '0' },
});
await browser.close();
writeFileSync('C:/Users/sebas/Desktop/Sebastian_Wojcik_CV_Iceland.pdf', pdf);
console.log('CV saved to Desktop as Sebastian_Wojcik_CV_Iceland.pdf');
