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
          <p className="updated">Last Updated: June 23, 2026</p>

          <h2>1. How Your Data Is Handled</h2>
          <p>SalesTrack Pro is built on a multi-tenant architecture. Each store operates in its own isolated workspace:</p>
          <ul>
            <li><strong>Your Account:</strong> Username, email, and encrypted password used only for login</li>
            <li><strong>Your Store Workspace:</strong> Products, sales, and receipts exist only inside your store account</li>
            <li><strong>Technical Logs:</strong> IP address and timestamps are meant for login security and error diagnostics</li>
          </ul>
          <p><strong>We cannot access, view, or use your store’s inventory, sales, or customer data.</strong> Row-level security provided by Supabase cloud infrastructure, ensures each store can only access its own records.</p>
          
          <h2>2. Data Ownership & Control</h2>
          <p>You own 100% of the data in your store account. SalesTrack Pro acts only as a technical service provider to run the software that powers your store while your full business / store data remains in a secure cloud server we subscribed to for robust security. No advertisers or third parties have access to your cloud secured data.</p>
          
          <h2>3. Data Storage & Security</h2>
          <p>SalesTrack Pro runs on Supabase, a secure cloud infrastructure. Industry-standard protections include:</p>
          <ul>
            <li><strong>Encryption:</strong> All data encrypted at rest and in transit via SSL/TLS</li>
            <li><strong>Tenant Isolation:</strong> Database-level security ensures Store A cannot access Store B’s records, and we as providers cannot view them</li>
            <li><strong>Backups:</strong> Automated daily backups are performed by our infrastructure provider for disaster recovery</li>
            <li><strong>Authentication:</strong> Passwords are hashed and never stored in plain text</li>
          </ul>
          <p>You are responsible for keeping your login credentials confidential and managing staff access within your store.</p>
          
          <h2>4. Service Providers</h2>
          <p>Your account runs on Supabase infrastructure. We do not use third-party analytics, trackers, or advertising networks.</p>
          <p>SalesTrack Pro loads Font Awesome icons from cdnjs.cloudflare.com. No personal or business data is sent to this CDN.</p>
          
          <h2>5. Data Retention & Deletion</h2>
          <p>Your store data is retained as long as your account is active. As the store owner, you may request account deletion and full data removal by contacting contact@cursorlordsystems.com. Upon verified request from the account owner, all associated records will be permanently deleted within 30 days.</p>
          
          <h2>6. Authorized Users Only</h2>
          <p>SalesTrack Pro is a business tool for store owners and their authorized staff. Account creation and store management must be performed by adults. Store owners are responsible for managing staff access and ensuring all users comply with this policy.</p>

          <h2>7. Changes to Policy</h2>
          <p>We may update this policy to reflect improvements to the service. Continued use after changes constitutes acceptance. Check "Last Updated" date.</p>

          <h2>8. Contact</h2>
          <p>For privacy questions or data deletion requests: contact@cursorlordsystems.com</p>

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