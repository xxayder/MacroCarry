import { Router } from "express";

const privacyRouter = Router();

privacyRouter.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MacroCarry – Privacy Policy</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0D0D0D;
      color: #F0F0F0;
      line-height: 1.7;
      padding: 0 1rem 4rem;
    }
    .container { max-width: 720px; margin: 0 auto; padding-top: 3rem; }
    .logo { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 2.5rem; }
    .logo-dot { width: 28px; height: 28px; background: #22C55E; border-radius: 50%; flex-shrink: 0; }
    .logo-name { font-size: 1.4rem; font-weight: 700; color: #F0F0F0; }
    h1 { font-size: 2rem; font-weight: 700; color: #F0F0F0; margin-bottom: 0.4rem; }
    .updated { font-size: 0.875rem; color: #9A9A9A; margin-bottom: 2.5rem; }
    h2 { font-size: 1.15rem; font-weight: 600; color: #22C55E; margin-top: 2rem; margin-bottom: 0.6rem; }
    p { color: #D0D0D0; margin-bottom: 1rem; }
    ul { color: #D0D0D0; padding-left: 1.5rem; margin-bottom: 1rem; }
    ul li { margin-bottom: 0.4rem; }
    a { color: #22C55E; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .divider { border: none; border-top: 1px solid #2E2E2E; margin: 2rem 0; }
    .contact-box {
      background: #1A1A1A;
      border: 1px solid #2E2E2E;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-top: 2rem;
    }
    .contact-box p { margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-dot"></div>
      <span class="logo-name">MacroCarry</span>
    </div>

    <h1>Privacy Policy</h1>
    <p class="updated">Last updated: July 22, 2026</p>

    <p>
      MacroCarry ("we", "our", or "us") is a personal food and macro-nutrient tracking app.
      This Privacy Policy describes what information we collect, how we use it, and your rights
      as a user. We are committed to protecting your privacy.
    </p>

    <hr class="divider" />

    <h2>1. Information We Collect</h2>
    <p>We collect only the information necessary to provide and improve the app:</p>
    <ul>
      <li>
        <strong>Account information</strong> — Your name and email address, obtained via Google
        OAuth sign-in through Supabase Auth. We do not receive or store your Google password.
      </li>
      <li>
        <strong>Food log data</strong> — Meals, foods, portion sizes, and timestamps that you
        voluntarily enter into the app.
      </li>
      <li>
        <strong>Goal data</strong> — Daily calorie and macro-nutrient targets you configure in
        Settings.
      </li>
      <li>
        <strong>Sharing permissions</strong> — Email addresses you explicitly add to share your
        diary with another person.
      </li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To display your food log, calorie ring, and macro progress within the app.</li>
      <li>To calculate calorie carryover across days when the feature is enabled.</li>
      <li>To allow other users you have whitelisted to view your diary.</li>
      <li>To authenticate you securely and maintain your session.</li>
    </ul>
    <p>We do <strong>not</strong> sell, rent, or share your personal data with third parties for
    advertising or marketing purposes.</p>

    <h2>3. Food Product Data</h2>
    <p>
      When you search for or scan a food item, the app queries the
      <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a>
      database — a free, public, community-maintained food database. Your search queries are sent
      to Open Food Facts servers. Please review their
      <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener">privacy policy</a>
      for details on how they handle requests.
    </p>

    <h2>4. Data Storage and Security</h2>
    <p>
      Your data is stored in a Supabase-hosted PostgreSQL database protected by Row Level Security
      (RLS). Only you — and users you explicitly share with — can read your food logs.
      Data is transmitted over HTTPS/TLS at all times.
    </p>

    <h2>5. Data Retention</h2>
    <p>
      Your data is retained as long as your account is active. You may request deletion of your
      account and all associated data at any time by contacting us (see below). We will process
      deletion requests within 30 days.
    </p>

    <h2>6. Children's Privacy</h2>
    <p>
      MacroCarry is not directed at children under the age of 13. We do not knowingly collect
      personal information from children under 13. If you believe a child has provided us with
      personal information, please contact us so we can delete it.
    </p>

    <h2>7. Your Rights</h2>
    <p>Depending on your jurisdiction, you may have the right to:</p>
    <ul>
      <li>Access the personal data we hold about you.</li>
      <li>Request correction of inaccurate data.</li>
      <li>Request deletion of your data.</li>
      <li>Object to or restrict certain processing.</li>
      <li>Data portability (receive your data in a machine-readable format).</li>
    </ul>
    <p>To exercise any of these rights, contact us at the address below.</p>

    <h2>8. Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. When we do, we will revise the
      "last updated" date at the top of this page. Continued use of the app after changes
      constitutes acceptance of the updated policy.
    </p>

    <h2>9. Contact</h2>
    <div class="contact-box">
      <p>
        If you have any questions about this Privacy Policy or wish to exercise your rights,
        please contact us at:<br /><br />
        <strong>MacroCarry Support</strong><br />
        <a href="mailto:privacy@macrocarry.app">privacy@macrocarry.app</a>
      </p>
    </div>
  </div>
</body>
</html>`);
});

export default privacyRouter;
