'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'
import './terms.css'

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
          <h1>Terms & Conditions</h1>
          <p className="updated">Last Updated: June 23, 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using SalesTrack Pro ("the Software"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Software.</p>

          <h2>2. License & Use</h2>
          <p>SalesTrack Pro grants you a limited, non-exclusive, non-transferable yearly license to use the Software for your store's internal inventory and POS operations. You may not:</p>
          <ul>
            <li>Copy, modify, or distribute any part thereof</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the Software for illegal purposes or outside applicable business regulations</li>
          </ul>

          <h2>3. User Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining confidentiality of your login credentials</li>
            <li>Accuracy of your store's inventory, pricing, and sales data entered</li>
            <li>Compliance with local business, tax, and data protection laws</li>
            <li>Regular data backups. SalesTrack Pro is not liable for data loss</li>
          </ul>

          <h2>4. Service Commitment</h2>
<p>
  SalesTrack Pro is built to run reliably for your daily operations. While we maintain strong uptime and security standards, 
  software services can occasionally experience interruptions due to internet connectivity, maintenance, or unforeseen technical issues. 
  We’ll work to resolve any disruptions quickly and keep your store running smoothly.
</p>
          <h2>5. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, SalesTrack Pro and its owners shall not be liable for any indirect or consequential damages, including loss of profits, data, or business interruption arising from use or misuse of the Software.</p>

          <h2>6. Termination</h2>
          <p>We reserve the right to suspend or terminate access for violation of these terms, non-payment, or suspected misuse.</p>

          <h2>7. Governing Law</h2>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in courts of Nigeria.</p>

          <h2>8. Contact</h2>
          <p>For questions about these Terms, contact: contact@cursorlordsystems.com</p>

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