export default function DeleteAccount() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>MacroCarry — Account Deletion</h1>
      <p className="lead">
        You have the right to delete your MacroCarry account and all associated data.
        This page explains what will be deleted, what (if anything) must be retained,
        and how to submit a deletion request.
      </p>

      <h2>Option 1 — Delete from within the App</h2>
      <p>
        An in-app automated account deletion feature has not yet been implemented. Please
        use the email method below to request deletion.
      </p>

      <h2>Option 2 — Email Deletion Request</h2>
      <p>
        Send an email to{" "}
        <a href="mailto:privacy@macrocarry.app?subject=Account%20Deletion%20Request&body=I%20would%20like%20to%20delete%20my%20MacroCarry%20account.%0A%0AEmail%20address%20on%20account%3A%20">
          privacy@macrocarry.app
        </a>{" "}
        with the subject line <strong>"Account Deletion Request"</strong>.
      </p>
      <p>Please include in the body of your email:</p>
      <ul>
        <li>The email address registered to your MacroCarry account.</li>
        <li>A statement that you wish to delete your account and all associated data.</li>
      </ul>
      <p>
        We will not ask for more information than is necessary to identify your account.
        We will not ask for your password.
      </p>

      <h2>What Will Be Deleted</h2>
      <p>Upon receiving and verifying your request, we will permanently delete:</p>
      <ul>
        <li>Your account credentials and authentication record.</li>
        <li>Your profile (email, username, display name, nutrition goals).</li>
        <li>All food log entries.</li>
        <li>Your personal food library (manually entered foods).</li>
        <li>All sharing permissions you have created or been granted.</li>
        <li>Feedback submissions linked to your account.</li>
        <li>Crash reports linked to your account.</li>
      </ul>
      <p>
        If Sentry error monitoring was active while you used the app, any diagnostic
        data held by Sentry will be removed from the Sentry dashboard. Sentry may
        retain anonymised aggregate data per their own retention policy.
      </p>

      <h2>What May Be Retained</h2>
      <p>
        We do not currently have a legal or regulatory obligation to retain any specific
        category of MacroCarry user data. In ordinary circumstances, nothing will be
        retained after your deletion request is processed.
      </p>

      <h2>Processing Time</h2>
      <p>
        We will acknowledge your request within <strong>5 business days</strong> and
        complete the deletion within <strong>30 days</strong> of receipt. You will
        receive a confirmation email when deletion is complete.
      </p>

      <h2>Effect of Deletion</h2>
      <p>
        Deleting your account is permanent and irreversible. All food logs, goals, and
        custom foods will be lost. If you shared your log with other users, they will
        immediately lose access. You may create a new account at any time with the same
        email address, but no historical data will be recoverable.
      </p>

      <h2>Questions</h2>
      <p>
        Contact us at{" "}
        <a href="mailto:privacy@macrocarry.app">privacy@macrocarry.app</a> for any
        questions about the deletion process.
      </p>
    </article>
  );
}
