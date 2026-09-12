'use client'

import Link from 'next/link'
import './privacy.css'

export default function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="updated">Last Updated: September 11, 2026 | Version: 1.0</p>
          <p className="intro">SalesTrack Pro is built and operated by CursorLord Systems. This Privacy Policy explains how information is handled when you use SalesTrack Pro.</p>

          <h2>1. Information We Handle</h2>
          <p>Depending on how you use SalesTrack Pro, the service may process:</p>
          <ul>
            <li>Account information such as name, email address and login information.</li>
            <li>Store information such as business name, address and contact details.</li>
            <li>Product, inventory, sales, receipt and business records entered into your store.</li>
            <li>Staff account information created by the Store Owner.</li>
            <li>Customer information entered into the system by the Merchant.</li>
            <li>Technical information such as IP address, browser/device information, timestamps and security or diagnostic records.</li>
            <li>Information contained in support requests or communications with CursorLord Systems.</li>
          </ul>
          <p>SalesTrack Pro only requires information reasonably necessary to provide, secure and maintain the service.</p>

          <h2>2. Your Business Data</h2>
          <p>The Merchant retains its rights to the business information entered into its SalesTrack Pro account.</p>
          <p>The Software processes this information to provide its functions, including sales recording, inventory management, reporting, analytics, staff management, audit records and related services.</p>
          <p><strong>We do not sell your business data or use your store&apos;s business records for advertising purposes.</strong></p>

          <h2>3. Multi-Tenant Data Isolation</h2>
          <p>The Software uses a multi-tenant architecture in which each store operates within its own data scope.</p>
          <p>Database-level access controls, including Row Level Security (RLS), are used to restrict access to records belonging to other stores.</p>
          <p>Your store data is intended to remain accessible only within the authorized account and roles associated with that store.</p>

          <h2>4. Account & Authentication Security</h2>
          <p>SalesTrack Pro uses Supabase infrastructure for authentication and database services.</p>
          <p>Passwords are handled through Supabase cloud authentication system and are not stored in the Software as readable plain-text passwords.</p>
          <p>Store Owners are responsible for protecting their login credentials and for properly managing staff accounts and permissions.</p>

          <h2>5. Technical & Security Records</h2>
          <p>For security, authentication, troubleshooting and accountability purposes, the Software may record technical information such as:</p>
          <ul>
            <li>IP address</li>
            <li>Date and time of activity</li>
            <li>Browser or device information</li>
            <li>Login and authentication events</li>
            <li>Software acceptance records</li>
            <li>Relevant system and diagnostic events</li>
          </ul>
          <p>Where an account owner electronically accepts the SalesTrack Pro End User License Agreement, the associated acceptance record may be retained as evidence of that acceptance.</p>

          <h2>6. Cloud Infrastructure</h2>
          <p>SalesTrack Pro uses Supabase as part of its cloud infrastructure for authentication, database storage and related services.</p>
          <p>Data transmitted between your device and the service is protected using standard encrypted network connections.</p>

          <h2>7. Reports, Exports & Backups</h2>
          <p>SalesTrack Pro saves the stores business records and data onto each Merchant's dedicated cloud database on supabase servers during normal operation.</p>
          <p>The Merchant should periodically download and retain important reports, records or other available exports for its own business continuity and record-keeping purposes.</p>
          <p>Reports and available exports are provided as part of the software&apos;s business-management functionality.</p>

          <h2>8. Personal Data Entered by the Merchant</h2>
          <p>A Merchant may enter personal information relating to employees, customers or other individuals into SalesTrack Pro.</p>
          <p>The Merchant is responsible for ensuring that it has the appropriate authority or lawful basis to collect and use such information and for using the system in accordance with applicable Nigerian data-protection requirements.</p>

          <h2>9. Data Retention & Deletion</h2>
          <p>Store information is retained while the account remains active or for as long as reasonably necessary to provide the service, comply with legal obligations, resolve disputes, maintain security records or enforce applicable agreements.</p>
          <p>A Store Owner or Merchant may request account closure or deletion of eligible store records by contacting:</p>
          <p><strong>contact@cursorlordsystems.com</strong></p>
          <p>Requests will be verified before any account or data deletion is performed.</p>
          <p>Certain records may need to be retained where required by law, for legitimate security purposes, or to establish or defend legal claims.</p>

          <h2>10. Third-Party Services</h2>
          <p>SalesTrack Pro relies on selected third-party infrastructure and services necessary to operate the application.</p>
          <p>These include cloud hosting, database, authentication, security, communications or other technical service providers.</p>
          <p>Such providers may process information only as necessary for the services they provide to SalesTrack Pro.</p>
          <p>SalesTrack Pro may also load third-party web resources required for the application&apos;s interface, such as Font Awesome resources delivered through Cloudflare&apos;s CDN.</p>

          <h2>11. Data Subject Rights</h2>
          <p>Where applicable under Nigerian data-protection law, individuals may have rights concerning their personal data, including rights relating to access, correction, deletion, restriction or other lawful requests.</p>
          <p>Requests concerning personal data handled through a Merchant&apos;s store should normally be directed first to the relevant Merchant, who controls the business purpose for which that information was collected.</p>
          <p>Privacy requests may also be sent to: <strong>contact@cursorlordsystems.com</strong></p>

          <h2>12. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy when the service, technology, legal requirements or data-handling practices change.</p>
          <p>The latest version will be published on this page with its updated date and version number.</p>
          <p>Where appropriate, material changes may also be communicated through the service or by other reasonable means.</p>

          <h2>13. Contact</h2>
          <p>For privacy questions, data requests or account-data deletion requests:</p>
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