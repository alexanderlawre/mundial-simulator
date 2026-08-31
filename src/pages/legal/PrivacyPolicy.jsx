import LegalLayout from './LegalLayout'

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" updated="[TODO: fill in launch date]">
      <p>
        Mundial ("we," "us," "the app") is a World Cup tournament simulator.
        This Privacy Policy explains what information we collect when you
        use Mundial, how we use it, and the choices you have.
      </p>

      <h2>1. Information We Collect</h2>
      <p>When you create an account to use Mundial, we collect:</p>
      <ul>
        <li>Name</li>
        <li>Email address</li>
        <li>Password (stored as a secure hash by our authentication provider — we never store or share it in plain text)</li>
        <li>Favorite/supported team (the national team you choose to follow)</li>
      </ul>
      <p>
        We also store the tables you submit for our league prediction games
        and a history of the World Cup simulations you complete while
        signed in, so they can be shown back to you on your Account page
        across devices.
      </p>
      <p>
        Separately, we automatically log anonymized simulation results
        (tournament mode, team counts, and outcomes such as
        winner/runner-up/third/fourth place) generated when anyone runs a
        simulation. These logs are not displayed back to you or other users
        tied to your identity — they're kept as a separate usage log for
        aggregate statistics.
      </p>
      <p>
        Standard technical data (such as IP address and request metadata)
        may also be logged automatically by our hosting provider (Vercel)
        as part of normal web server operation.
      </p>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To operate and improve the Mundial simulator experience</li>
        <li>To generate aggregate, non-identifying usage statistics</li>
        <li>To respond to support or data-deletion requests</li>
        <li>To maintain the security and integrity of the service</li>
      </ul>

      <h2>3. Where Data Is Stored</h2>
      <p>
        Account data (name, email, hashed password, favorite team,
        submitted tables, and simulation history) is stored and managed by
        Supabase, our authentication and database provider. Anonymized
        signup and simulation logs used for aggregate statistics are stored
        separately using Upstash Redis, accessed through serverless
        functions hosted on Vercel. Access to the aggregate log is
        restricted to the app administrator via a password-protected admin
        view. We do not display your name or email to other users of the
        app.
      </p>

      <h2>4. Sharing, Transfer, and Possible Sale of Information</h2>
      <p>
        <strong>
          We may share, transfer, or sell the information described in
          Section 1
        </strong>{' '}
        (including name and email) — for example, in connection with a
        business transaction (such as a sale, merger, or transfer of the
        app or its assets), or to third parties for purposes not otherwise
        limited by this policy. If our practices around sharing or selling
        personal information change materially, we will update this policy
        accordingly.
      </p>
      <p>
        We do not currently use your information for third-party
        advertising, and we do not sell information to data brokers for
        marketing purposes as of the date above. If that changes, this
        section will be updated to reflect it.
      </p>

      <h2>5. Third-Party Service Providers</h2>
      <ul>
        <li><strong>Vercel</strong> — application hosting and serverless functions</li>
        <li><strong>Upstash</strong> — Redis-based data storage</li>
        <li><strong>Supabase</strong> — account authentication and database storage</li>
      </ul>

      <h2>6. Cookies and Local Storage</h2>
      <p>
        Mundial uses your browser's local storage (not third-party tracking
        cookies) to remember your profile and in-progress tournaments on
        your device. See our <a href="/cookies">Cookie Policy</a> for
        details.
      </p>

      <h2>7. Children's Privacy</h2>
      <p>
        Mundial is not directed at children under 13, and we do not
        knowingly collect information from children under 13. If you
        believe a child has provided us with personal information, please
        contact us using the details below so we can remove it.
      </p>

      <h2>8. Your Rights and Data Deletion Requests</h2>
      <p>
        You may request access to, correction of, or deletion of your
        personal information at any time by contacting us at the email
        below. We will make reasonable efforts to fulfill valid requests.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material
        changes will be reflected by updating the date above.
      </p>

      <h2>10. Contact</h2>
      <p>Questions or data requests: <strong>lawrenceqa9@gmail.com</strong></p>
    </LegalLayout>
  )
}
