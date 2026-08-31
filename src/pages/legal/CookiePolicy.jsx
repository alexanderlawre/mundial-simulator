import LegalLayout from './LegalLayout'

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" updated="[TODO: fill in launch date]">
      <p>
        This Cookie Policy explains how Mundial uses your browser's local
        storage. Mundial does <strong>not</strong> use third-party tracking
        cookies, advertising cookies, or analytics cookies.
      </p>

      <h2>1. What We Actually Use: Local Storage, Not Tracking Cookies</h2>
      <p>
        Instead of traditional cookies, Mundial uses your browser's
        <code> localStorage</code> to remember information only on your own
        device. This data is never transmitted to us automatically — it
        simply lets the app remember your session between visits.
      </p>
      <table>
        <thead>
          <tr><th>Key</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td>mundial.profile</td><td>Your name, email, and supported team, so you don't have to re-enter them each visit</td></tr>
          <tr><td>mundial.activeTournament</td><td>Your in-progress simulation, so you can resume where you left off</td></tr>
          <tr><td>mundial.adminDataCache</td><td>(Admin only) A temporary local cache of admin dashboard data, used to power the "View All" detail pages</td></tr>
          <tr><td>mundial.theme</td><td>Your dark/light mode preference</td></tr>
          <tr><td>mundial.language</td><td>Your selected display language</td></tr>
        </tbody>
      </table>

      <h2>2. No Third-Party Tracking</h2>
      <p>
        We do not use Google Analytics, advertising pixels, or any other
        third-party tracking or ad-serving cookies at this time. If that
        changes, this policy will be updated to reflect it.
      </p>

      <h2>3. How to Clear This Data</h2>
      <p>
        You can clear all locally stored Mundial data at any time by
        clearing your browser's site data/local storage for this site, or
        by using the in-app "Reset Profile" option where available.
      </p>

      <h2>4. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Material
        changes will be reflected by updating the date above.
      </p>

      <h2>5. Contact</h2>
      <p>Questions about this policy: <strong>lawrenceqa9@gmail.com</strong></p>
    </LegalLayout>
  )
}
