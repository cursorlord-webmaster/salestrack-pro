'use client'

import Link from 'next/link'
import './terms.css'

export default function SoftwareTermsPage() {
  return (
    <>
      {/* LANDING HEADER */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="brand">
            <img
              src="/landing-logo.png"
              alt="SalesTrack Pro"
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>
      </header>

      <div className="legal-container">
        <div className="legal-box">
          <h1>Software Terms & Conditions</h1>
          <p className="updated">Last Updated: September 11, 2026 | Version: 1.0</p>
          <p className="intro">
            These Software Terms & Conditions (“Terms”) govern the access to and use of SalesTrack Pro, a cloud-based retail management, POS and inventory software built and operated by CursorLord Systems (“Provider”, “we”, “us” or “our”).<br/>
            The business owner or authorized person using SalesTrack Pro is referred to as the Merchant, you or your.<br/>
            These Terms should be read together with the SalesTrack Pro Privacy Policy and, where applicable, the End User License Agreement accepted during store activation.
          </p>

          <h2>1. Acceptance</h2>
          <p>By registering, accessing or using SalesTrack Pro, or by electronically accepting the SalesTrack Pro End User License Agreement, you agree to these Terms.</p>
          <p>If you are using SalesTrack Pro on behalf of a business, you confirm that you are authorized to operate the account and accept these Terms on behalf of that business.</p>

          <h2>2. License to Use SalesTrack Pro</h2>
          <p>Subject to these Terms and the applicable license or subscription period, CursorLord Systems grants the Merchant a limited, non-exclusive, non-transferable and revocable right to access and use SalesTrack Pro for the Merchant&apos;s legitimate business operations.</p>
          <p>The license does not transfer ownership of the software or its underlying technology to the Merchant.</p>

          <h2>3. Store Account & Staff Access</h2>
          <p>The Store Owner is responsible for:</p>
          <ul>
            <li>Providing accurate store information.</li>
            <li>Keeping owner login credentials secure.</li>
            <li>Creating and managing authorized staff accounts.</li>
            <li>Assigning appropriate staff roles and permissions.</li>
            <li>Removing or disabling access for staff who are no longer authorized.</li>
            <li>Reviewing available sales, inventory and audit information where appropriate.</li>
          </ul>
          <p>Each staff member should use their assigned account rather than another person&apos;s credentials.</p>
          <p>The Merchant remains responsible for activities carried out through accounts under its control.</p>

          <h2>4. Sales, Inventory & Business Records</h2>
          <p>SalesTrack Pro provides tools for recording and managing sales, products, inventory, receipts, staff activity, reports and related business information.</p>
          <p>The Merchant remains responsible for the accuracy of information entered into the system and for verifying physical stock, prices, sales records and other business information.</p>
          <p>SalesTrack Pro is a management and record-keeping tool. It does not replace the Merchant&apos;s own accounting, stock verification, financial controls or business judgment.</p>

          <h2>5. Audit Trail & Operational Monitoring</h2>
          <p>The Software provides audit records, staff roles, transaction records and other controls intended to improve accountability and help Merchants identify discrepancies or unusual activity.</p>
          <p>These features are designed to assist business oversight but do not guarantee that theft, fraud, stock loss, unauthorized activity or other business losses will be completely prevented 100%.</p>
          <p>The Merchant remains responsible for appropriate supervision and review of its business operations.</p>

          <h2>6. Business Analytics & Forecasts</h2>
          <p>Where SalesTrack Pro provides analytics, business health indicators, forecasts, profitability information or similar decision-support features, such information is provided to assist the Merchant&apos;s business assessment.</p>
          <p>Such information should not be treated as guaranteed financial results, accounting advice, tax advice, investment advice or a 100% guarantee of future business performance.</p>
          <p>The Merchant remains responsible for decisions made using information produced by the software.</p>

          <h2>7. Cloud Service & Internet Requirement</h2>
          <p>SalesTrack Pro is a cloud-based application and requires an active internet connection for normal operation and data synchronization.</p>
          <p>Service availability may be affected by circumstances outside the Provider&apos;s reasonable control, including:</p>
          <ul>
            <li>Internet or telecommunications failures.</li>
            <li>Power outages.</li>
            <li>The Merchant’s computer / mobile device issues or hardware problems.</li>
            <li>The Merchant’s browser or operating-system problems.</li>
            <li>Our third-party cloud or infrastructure failures.</li>
            <li>Scheduled maintenance.</li>
            <li>Security incidents or other events requiring protective action.</li>
          </ul>
          <p>The Provider will make reasonable efforts to maintain and restore the service when service interruptions occur.</p>

          <h2>8. Data Storage & Business Continuity</h2>
          <p>SalesTrack Pro stores all business records and operational data automatically in real-time to the Merchant’s dedicated cloud database on supabase servers during normal system operation.</p>
          <p>The Merchant should periodically download important reports, records and available exports on the Software and maintain its own business copies where appropriate.</p>
          <p>The Provider is not responsible for a Merchant&apos;s failure to retain business records that could reasonably have been exported or preserved by the Merchant.</p>

          <h2>9. Merchant Data</h2>
          <p>The Merchant retains its rights to the business data it enters into SalesTrack Pro.</p>
          <p>The Provider may process and store such information as necessary to:</p>
          <ul>
            <li>Operate SalesTrack Pro.</li>
            <li>Provide requested features.</li>
            <li>Maintain and secure the service.</li>
            <li>Troubleshoot technical problems.</li>
            <li>Provide customer support.</li>
            <li>Maintain system integrity.</li>
            <li>Comply with legal obligations.</li>
          </ul>
          <p>The handling of personal information is further described in the SalesTrack Pro Privacy Policy.</p>

          <h2>10. Privacy & Personal Data</h2>
          <p>The Merchant is responsible for ensuring that personal information entered into SalesTrack Pro is collected and used lawfully.</p>
          <p>Where the Software processes personal data on behalf of a Merchant, the Provider will handle such information for purposes connected with providing and maintaining the service, subject to applicable data-protection requirements.</p>
          <p>The Provider may maintain technical and security records, including login, IP, device, timestamp and electronic acceptance records, where reasonably necessary for security, accountability, service operation or legal purposes.</p>

          <h2>11. Intellectual Property</h2>
          <p>SalesTrack Pro and its underlying technology remain the intellectual property of CursorLord Systems.</p>
          <p>This includes, among other things:</p>
          <ul>
            <li>Source code.</li>
            <li>Software architecture.</li>
            <li>Database structures and system design.</li>
            <li>User interface and original visual elements.</li>
            <li>Algorithms and application logic.</li>
            <li>Audit and operational systems.</li>
            <li>Documentation.</li>
            <li>SalesTrack Pro branding and associated materials.</li>
          </ul>
          <p>Nothing in these Terms transfers ownership of these materials to the Merchant.</p>

          <h2>12. Acceptable Use</h2>
          <p>You must not use SalesTrack Pro to:</p>
          <ul>
            <li>Circumvent authentication, role restrictions or security controls.</li>
            <li>Reverse engineer, decompile or attempt to extract source code.</li>
            <li>Copy or reproduce substantial portions of the software.</li>
            <li>Resell, sublicense or provide unauthorized third-party access to the service.</li>
            <li>Introduce malicious code or deliberately interfere with the service.</li>
            <li>Manipulate or falsify system records.</li>
            <li>Use automated methods to attack, overload or abuse the service.</li>
            <li>Use the software for unlawful purposes.</li>
          </ul>
          <p>We may restrict or suspend access where necessary to protect the service or system security.</p>

          <h2>13. Service Changes & Maintenance</h2>
          <p>SalesTrack Pro may be updated, improved, modified or temporarily taken offline for maintenance, security, bug fixes or infrastructure changes.</p>
          <p>Features may be added, modified or discontinued as the software develops or upgrades.</p>
          <p>Where a significant change or system upgrade materially affects an existing Merchant&apos;s use of the service, reasonable notice will be provided where practicable.</p>

          <h2>14. Third-Party Infrastructure</h2>
          <p>SalesTrack Pro depends on third-party infrastructure and services required to operate the platform.</p>
          <p>The Provider does not control the availability, policies or technical operation of independent third-party providers.</p>
          <p>Third-party services may change their availability, features or technical requirements from time to time.</p>

          <h2>15. Fees, License Period & Expiry</h2>
          <p>Access to SalesTrack Pro is subject to the license or subscription terms agreed with the Merchant.</p>
          <ul>
            <li>Access remains available while the applicable license is active.</li>
            <li>Expired licenses may result in restricted or suspended access.</li>
            <li>The Merchant must not continue using the service after termination or expiry unless access has been renewed or otherwise authorized.</li>
          </ul>
          <p>Any specific commercial terms, pricing, renewal arrangements or payment obligations communicated to the Merchant form part of the applicable commercial arrangement.</p>

          <h2>16. Suspension & Termination</h2>
          <p>CursorLord Systems may suspend or terminate access to the Software where reasonably necessary because of:</p>
          <ul>
            <li>Expired or unpaid licensing.</li>
            <li>Serious violation of these Terms.</li>
            <li>Unauthorized access or attempted security compromise.</li>
            <li>Abuse of the service.</li>
            <li>Fraudulent or unlawful activity.</li>
            <li>Conduct that materially threatens the service or other users.</li>
          </ul>
          <p>Where reasonably practicable, the Merchant will be given notice and an opportunity to resolve the issue before termination, except where immediate action is necessary for security, legal or operational reasons.</p>

          <h2>17. Data Following Termination</h2>
          <p>Following termination or expiry, access to the Merchant&apos;s account may be restricted.</p>
          <p>Where applicable, the Merchant may request or obtain available exports of its business information before permanent deletion, subject to the Provider&apos;s retention procedures and applicable legal requirements.</p>
          <p>Certain technical, security, transaction or acceptance records may be retained where reasonably necessary for legal, security, accounting or dispute-resolution purposes.</p>

          <h2>18. Software Disclaimer</h2>
          <p>SalesTrack Pro is provided as a business software service and is intended to assist with retail operations.</p>
          <p>While CursorLord Systems works to maintain reliable and secure operation, NO SOFTWARE or internet service can guarantee uninterrupted availability, complete accuracy, or complete protection against every possible technical, operational or security event.</p>
          <p>The Merchant should maintain appropriate business controls and records of their business operations in SalesTrack Pro.</p>

          <h2>19. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable Nigerian law, CursorLord Systems will not be responsible for indirect, incidental, special or consequential losses arising from the use of or inability to use SalesTrack Pro, including business interruption, loss of anticipated profits or losses resulting from circumstances outside the Provider&apos;s reasonable control.</p>
          <p>Nothing in these Terms excludes or limits any liability or legal right that cannot lawfully be excluded or limited under applicable law.</p>

          <h2>20. Changes to These Terms</h2>
          <p>CursorLord Systems may update these Terms when necessary to reflect changes to the service, technology, business operations or applicable legal requirements.</p>
          <p>The Last Updated date and version number will be changed whenever a new version is published.</p>
          <p>For material changes, reasonable notice may be provided through the software, email or another appropriate communication method.</p>
          <p>Continued use of SalesTrack Pro after a revised version becomes effective, constitutes acceptance of the revised Terms to the extent permitted by applicable law.</p>

          <h2>21. Governing Law & Disputes</h2>
          <p>These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
          <p>The parties will first attempt in good faith to resolve disputes amicably.</p>
          <p>Where a dispute cannot be resolved through reasonable efforts, either party may pursue the remedies available under applicable Nigerian law.</p>

          <h2>22. Severability</h2>
          <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue to apply to the extent permitted by law.</p>

          <h2>23. Entire Agreement</h2>
          <p>These Terms, together with the applicable SalesTrack Pro End User License Agreement, Privacy Policy and any agreed commercial or subscription terms, constitute the principal terms governing the Merchant&apos;s use of SalesTrack Pro.</p>

          <h2>24. Contact</h2>
          <p>For questions concerning these Terms or SalesTrack Pro:</p>
          <p><strong>CursorLord Systems</strong><br/>Email: contact@cursorlordsystems.com</p>
          <br/>
          <p><strong>SalesTrack Pro<br/>Built and operated by CursorLord Systems.</strong></p>

          <div className="back-to-home">
            <Link href="/homepage" className="btn-ghost">
              Back to Home Page
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}