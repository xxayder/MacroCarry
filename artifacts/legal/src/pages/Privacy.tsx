export default function Privacy() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>MacroCarry Privacy Policy</h1>
      <p className="lead">
        <strong>Developer / Publisher:</strong> xayder<br />
        <strong>App name:</strong> MacroCarry<br />
        <strong>Effective date:</strong> July 22, 2026<br />
        <strong>Last updated:</strong> July 22, 2026<br />
        <strong>Privacy contact:</strong>{" "}
        <a href="mailto:privacy@macrocarry.app">privacy@macrocarry.app</a>
      </p>

      <p>
        MacroCarry is a food and nutrition tracking application. This Privacy Policy
        explains what information we collect, why we collect it, how we use it, and what
        choices you have. MacroCarry is not a medical device and does not diagnose,
        treat, cure, or prevent any disease or medical condition. Nutrition information
        provided by the app is for general informational purposes only and is not a
        substitute for professional medical advice.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Account and Profile Information</h3>
      <p>When you create an account we collect:</p>
      <ul>
        <li><strong>Email address</strong> — used to identify your account and authenticate you.</li>
        <li><strong>Password</strong> — never stored by MacroCarry; it is hashed and held by Supabase.</li>
        <li><strong>Username</strong> — chosen at sign-up, stored in your profile.</li>
        <li><strong>Display name</strong> — optional, user-editable.</li>
      </ul>

      <h3>1.2 Nutrition Goals</h3>
      <p>
        You may set daily targets for calories, protein, carbohydrates, fat, fiber,
        sugar, and sodium. These numbers are stored in your profile so the app can
        display your progress.
      </p>

      <h3>1.3 Food Log Data</h3>
      <p>
        When you log food, we store: the date, meal type, food name, brand, barcode
        (if scanned), serving size, serving unit, and per-serving nutritional values
        (calories, protein, carbohydrates, fat, fiber, sugar, sodium). This is health
        and nutrition information.
      </p>

      <h3>1.4 Your Personal Food Library</h3>
      <p>
        If you create a custom food entry using Manual Entry, that food — including its
        name, brand, barcode, and nutritional data — is stored in your private food
        library.
      </p>

      <h3>1.5 Sharing Information</h3>
      <p>
        If you choose to share your food log with another person, we store the email
        address you provide. That person gains read-only access to your food log.
        You can revoke access at any time in Settings. We do not share your data with
        any other users unless you explicitly grant access.
      </p>

      <h3>1.6 Feedback</h3>
      <p>
        If you submit feedback through the app (Settings → Send Feedback), we collect
        your message, a category (bug, suggestion, or other), your user ID, your email
        address, and basic device information: operating system platform (iOS or
        Android) and OS version number. We use this solely to respond to and prioritize
        your report.
      </p>

      <h3>1.7 Crash Reports</h3>
      <p>
        If the app encounters an unexpected error, it automatically submits a crash
        report containing the error message, stack trace, your user ID, your email
        address, and device platform and OS version. This helps us identify and fix
        bugs.
      </p>

      <h3>1.8 Error Monitoring via Sentry (Conditional)</h3>
      <p>
        MacroCarry may use Sentry, a third-party error monitoring service, to capture
        additional diagnostic information when crashes or errors occur. When active,
        Sentry may collect: error messages and stack traces, app version and release,
        session data, performance traces, and your user ID and email address to
        associate errors with your account.
      </p>
      <p>
        Sentry is only active when we have configured a Sentry Data Source Name (DSN)
        for the app. Sentry's privacy policy is available at{" "}
        <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer">
          https://sentry.io/privacy/
        </a>
        .
      </p>

      <h2>2. Information We Do Not Collect</h2>
      <ul>
        <li>
          <strong>Location data.</strong> MacroCarry never requests or uses your
          device's location.
        </li>
        <li>
          <strong>Photos or images.</strong> The camera is used exclusively for
          barcode scanning. No photographs are captured, stored, or transmitted.
        </li>
        <li>
          <strong>Advertising identifiers.</strong> We do not use advertising SDKs or
          collect advertising identifiers.
        </li>
        <li>
          <strong>Contacts.</strong> We do not access your contacts.
        </li>
        <li>
          <strong>Payment information.</strong> MacroCarry does not currently process
          payments and does not collect financial data.
        </li>
      </ul>

      <h2>3. Camera Permission</h2>
      <p>
        MacroCarry requests access to your device camera solely to scan food product
        barcodes. The camera viewfinder is live during scanning; no image or video is
        stored or transmitted. When a barcode is recognised, only the barcode number
        is sent to Open Food Facts to retrieve nutritional data.
      </p>

      <h2>4. Third-Party Services</h2>

      <h3>4.1 Supabase</h3>
      <p>
        Supabase is our authentication and database provider. All user data described
        in this policy is stored in Supabase-hosted PostgreSQL databases. Supabase
        acts as a data processor on our behalf. Supabase's privacy policy:{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
          https://supabase.com/privacy
        </a>
        .
      </p>

      <h3>4.2 Open Food Facts</h3>
      <p>
        When you search for a food or scan a barcode, MacroCarry queries the Open Food
        Facts API. The query contains only the barcode number or search text — no
        personal information is included. Open Food Facts is a free, open database.
        Their privacy policy:{" "}
        <a href="https://world.openfoodfacts.org/privacy" target="_blank" rel="noopener noreferrer">
          https://world.openfoodfacts.org/privacy
        </a>
        .
      </p>

      <h3>4.3 Expo / EAS</h3>
      <p>
        MacroCarry is built with Expo and may receive over-the-air updates via Expo
        Application Services (EAS). Updates contain only the app binary; no user data
        is transmitted as part of this process.
      </p>

      <h2>5. How We Use Your Information</h2>
      <table>
        <thead>
          <tr>
            <th>Data category</th>
            <th>Why we collect it</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Email, password</td>
            <td>Authenticate your identity and secure your account</td>
          </tr>
          <tr>
            <td>Username, display name</td>
            <td>Personalise the app experience</td>
          </tr>
          <tr>
            <td>Nutrition goals</td>
            <td>Display progress, calculate carryover</td>
          </tr>
          <tr>
            <td>Food logs</td>
            <td>Show your daily and weekly nutrition summary</td>
          </tr>
          <tr>
            <td>Personal food library</td>
            <td>Let you reuse custom foods across log entries</td>
          </tr>
          <tr>
            <td>Sharing permissions</td>
            <td>Grant read-only access to the people you choose</td>
          </tr>
          <tr>
            <td>Feedback</td>
            <td>Fix bugs and prioritise improvements</td>
          </tr>
          <tr>
            <td>Crash reports</td>
            <td>Identify and fix stability issues</td>
          </tr>
          <tr>
            <td>Sentry data (conditional)</td>
            <td>Error monitoring and performance diagnostics</td>
          </tr>
        </tbody>
      </table>
      <p>
        We do not sell your personal data. We do not use your food log or health data
        for advertising or sell it to data brokers.
      </p>

      <h2>6. Data Sharing</h2>
      <p>
        We do not sell, rent, or trade your personal information to third parties.
        We share data only with:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — as our database and authentication provider (data processor).
        </li>
        <li>
          <strong>Sentry</strong> — for error monitoring, when configured (data processor).
        </li>
        <li>
          <strong>Other users you authorise</strong> — when you use the sharing feature,
          the recipient can view your food logs.
        </li>
        <li>
          <strong>Legal requirements</strong> — if required by law, court order, or
          government authority.
        </li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        Your account data, food logs, and associated profile information are retained
        for as long as your account is active. Crash reports and feedback are retained
        to assist with ongoing development. We have not set automated expiry on any
        data category. If you request deletion of your account, all associated data
        will be deleted as described in the <a href="/delete-account">Account Deletion</a>{" "}
        section.
      </p>

      <h2>8. Security</h2>
      <p>
        We use Supabase Row Level Security (RLS) policies so that each user can only
        access their own data. All data is transmitted over TLS. We do not store
        passwords in plaintext. We cannot guarantee absolute security — no system can —
        but we take reasonable technical and organisational measures to protect your
        information.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        MacroCarry is intended for users who are 13 years of age or older (or the
        minimum digital consent age in your jurisdiction). We do not knowingly collect
        personal data from children under 13. If you believe a child under 13 has
        provided us with personal information, please contact us at{" "}
        <a href="mailto:privacy@macrocarry.app">privacy@macrocarry.app</a> and we will
        delete it.
      </p>

      <h2>10. Your Choices and Rights</h2>
      <ul>
        <li>
          <strong>Access and correction.</strong> You can view and edit your profile
          and goals in Settings at any time.
        </li>
        <li>
          <strong>Sharing.</strong> You can revoke sharing access at any time in
          Settings → Share my log.
        </li>
        <li>
          <strong>Account and data deletion.</strong> You may request full deletion of
          your account and all associated data. See the{" "}
          <a href="/delete-account">Account Deletion</a> page.
        </li>
        <li>
          <strong>Camera permission.</strong> You can revoke camera access in your
          device settings at any time. Barcode scanning will be unavailable, but the
          rest of the app will continue to work.
        </li>
      </ul>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy as the app evolves. When we make material
        changes, we will update the "Last updated" date at the top of this page. We
        encourage you to review this policy periodically.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        For any privacy questions or requests, contact us at:{" "}
        <a href="mailto:privacy@macrocarry.app">privacy@macrocarry.app</a>
      </p>
    </article>
  );
}
