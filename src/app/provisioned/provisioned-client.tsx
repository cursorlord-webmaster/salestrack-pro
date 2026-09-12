'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'

export default function ProvisionedClient({
  token,
  tokenId,
  storeId,
  storeName,
  ownerEmail,
}: {
  token: string
  tokenId: string
  storeId: string
  storeName: string
  ownerEmail: string
}) {
  const [hasScrolled, setHasScrolled] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const eulaRef = useRef<HTMLDivElement>(null)

  const onScroll = () => {
    if (!eulaRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = eulaRef.current
    if (scrollTop + clientHeight >= scrollHeight - 15) {
      setHasScrolled(true)
    }
  }

  const handleAccept = async () => {
    if (!hasScrolled ||!agreed) return
    setLoading(true)
    try {
      const res = await fetch('/api/provisioned/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, tokenId, storeId, ownerEmail }),
      })
      const data = await res.json()
      if (data.success) setAccepted(true)
      else alert(data.error || 'Acceptance failed')
    } catch {
      alert('Network error')
    } finally {
      setLoading(false)
    }
  }

  // --- ACCEPTED STATE - ALSO MOBILE CENTERED ---
  if (accepted) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded- shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="mt-4 text-2xl font-black text-black tracking-tight">Store Activated!</h1>
          <p className="mt-3 text- text-zinc-700 leading-relaxed">
            Congratulations! You have accepted the License Agreement for <br />
            <span className="font-bold text-black text-lg">{storeName}</span>
          </p>

          <div className="mt-6 bg-zinc-50 border border-zinc-200 rounded-2xl p-5 text-center">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your Store Login</p>
            <p className="mt-2 text-sm text-zinc-600">Email</p>
            <p className="font-bold text-black">{ownerEmail}</p>
            <div className="my-4 h-px bg-zinc-200" />
            <p className="text-sm text-zinc-600">Temporary Password</p>
            <p className="text-sm font-medium text-zinc-800 mt-1">
              Check WhatsApp — Admin will send it separately for your security.
            </p>
            <p className="text- text-zinc-500 mt-3">Your IP and acceptance time have been securely logged as proof of agreement.</p>
          </div>

          <a
            href="/client-login"
            className="mt-6 w-full inline-block bg-black text-white py-4 rounded-full font-bold text- tracking-wide"
          >
            Proceed to Store Login →
          </a>
        </div>
      </div>
    )
  }

  // --- MAIN EULA GATE - MOBILE APP STYLE ---
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-start md:items-center justify-center p-0 md:p-6">
      <div className="w-full max-w-lg bg-white md:rounded- shadow-2xl min-h-screen md:min-h-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-10 pb-6 text-center bg-gradient-to-b from-zinc-50 to-white">
          <div className="w-30 h-30 mx-auto relative">
            <Image
              src="/eula-page.png"
              alt="SalesTrack Pro Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="mt-0.3 text-center">
            <span 
              style={{ fontSize: '22px', fontWeight: 800, lineHeight: '1.2' }}
              className="block text-black tracking-tight"
            >
              Welcome To SalesTrack Pro!
            </span>
            
            <span 
              style={{ fontSize: '18px', fontWeight: 900, wordBreak: 'break-word' }}
              className="inline-block mt-3 mb-3 max-w-[90%] px-5 py-2.5 bg-[#1e3a8a] text-white rounded-md tracking-tight shadow-md leading-tight text-center"
            >
              {storeName}
            </span>
            
            <span 
              style={{ fontSize: '22px', fontWeight: 800, lineHeight: '1.2' }}
              className="block text-black tracking-tight"
            >
              Now It&apos;s Time To Activate Your Store.
            </span>
          </h1>
          <p className="mt-3 text- text-zinc-600 leading-relaxed max-w- mx-auto text-center">
            Your new store is ready! Please carefully read and accept the End User License Agreement below before you proceed.
          </p>
        </div>

        {/* EULA Box */}
        <div className="px-5 pb-6">
          <div
            ref={eulaRef}
            onScroll={onScroll}
            className="h- md:h-72 overflow-y-auto border border-zinc-200 rounded-2xl p-5 bg-zinc-50 text-left"
          >
            <h3 className="font-black text- text-black uppercase tracking-widest mb-1 text-center">
              SALESTRACK PRO - END USER LICENSE AGREEMENT
            </h3>
            <p className="text- text-zinc-500 text-center mb-1">Effective Date: May 11, 2026</p>
            <p className="text- text-zinc-500 text-center mb-4">Version: 1.0</p>
            <p className="text- text-zinc-700 text-center mb-5 leading-5">
              This Agreement is between you, the Merchant, and CursorLord Systems, the Provider of SalesTrack Pro.
              By clicking “Agree & Activate Store”, you confirm that you have read and accepted this Agreement.
            </p>

            <div className="space-y-4 text- leading-6 text-zinc-800 text-left">
              <p><strong className="text-black">1. License to Use</strong><br/>The Provider grants the Merchant a limited, non-exclusive, non-transferable right to access and use SalesTrack Pro for the Merchant’s own business operations for store: <strong>{storeName}</strong> during the period of an active license.</p>

              <p><strong className="text-black">2. Your Store & Staff Accounts</strong><br/>The Merchant is responsible for the accuracy of store information and for keeping owner and staff login credentials secure. Where staff accounts are provided, each staff member should use their assigned account. The Merchant is responsible for managing staff access and reviewing available sales and audit records within the system.</p>

              <p><strong className="text-black">3. Sales, Inventory & Audit Records</strong><br/>SalesTrack Pro provides tools for recording sales, managing inventory, monitoring business activity and maintaining audit records. These features are strictly intended to help the Merchant monitor operations and identify discrepancies or unusual activity. They do not provide 100% ABSOLUTE guarantee that theft, fraud, stock loss or other business losses will be completely prevented. The Merchant remains responsible for appropriate staff supervision, physical stock verification and review of business records.</p>

              <p><strong className="text-black">4. Online Service & Connectivity</strong><br/>SalesTrack Pro is a cloud-based service and requires an active internet connection to operate and synchronize data. The Provider is not responsible for interruptions or delays caused by circumstances outside its reasonable control, including internet service interruptions, power outages, device or hardware problems, or failures of third-party infrastructure.</p>

              <p><strong className="text-black">5. Software Ownership</strong><br/>SalesTrack Pro, including its software, source code, interface, database structure, system architecture, algorithms and other underlying technology, remains the property of the Provider. The Merchant receives a right to use the software, not ownership of the software or its underlying technology. The Merchant may not copy, reverse engineer, resell, sublicense, or attempt to gain unauthorized access to the software or its underlying systems.</p>

              <p><strong className="text-black">6. Merchant Data</strong><br/>The Merchant retains its rights to the business information entered into SalesTrack Pro. The Provider will use and process such information as necessary to operate, maintain, secure and support the service, subject to the SalesTrack Pro Privacy Policy.</p>

              <p><strong className="text-black">7. License Period</strong><br/>Access to SalesTrack Pro is provided according to the Merchant’s agreed license or subscription period. Access may be restricted or suspended when the license expires or where necessary because of serious misuse, security concerns or violation of this Agreement.</p>

              <p><strong className="text-black">8. Acceptance & Electronic Record</strong><br/>By clicking “Agree & Activate Store”, the Merchant provides electronic acceptance of this Agreement. The Provider may record the acceptance date and time, account information, IP address, device/browser information and the version of this Agreement accepted. This record may be retained as evidence of the Merchant’s acceptance.</p>

              <p><strong className="text-black">9. Governing Law</strong><br/>This Agreement is governed by the laws of the Federal Republic of Nigeria. Any dispute will first be addressed through good-faith efforts to resolve the matter amicably. Where a dispute cannot be resolved amicably, the parties may pursue the remedies available under applicable Nigerian law.</p>

              <div className="pt-5 text-center border-t border-zinc-200 mt-2">
                <p className="font-bold text-black text-">— End of Agreement v1.0 —</p>
                <p className="text- text-zinc-500 mt-1">Scroll to bottom completed ✓</p>
              </div>
              <div className="h-4" />
            </div>
          </div>

          {!hasScrolled && (
            <p className="text-center text- font-semibold text-amber-600 mt-3 animate-pulse">
              👇 Scroll to the bottom to enable agreement
            </p>
          )}

          {hasScrolled && (
            <p className="text-center text- font-semibold text-green-600 mt-3">
              ✅ You have read the full agreement
            </p>
          )}

          <label className="mt-5 flex gap-3 items-start bg-zinc-900 rounded-2xl p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={!hasScrolled}
              className="mt-1 h-5 w-5 rounded accent-white"
            />
            <div className="text-left">
              <span className="text- leading-5 text-white font-medium">
                I have read and agree to the SalesTrack Pro Terms of Service and Privacy Policy.
              </span>
              <p className="text- leading-4 text-zinc-400 mt-1">
                Your acceptance is recorded with the date, time and technical information associated with the acceptance.
              </p>
            </div>
          </label>

          <button
            onClick={handleAccept}
            disabled={!hasScrolled ||!agreed || loading}
            className="mt-5 w-full bg-black text-white py-4 rounded-full font-bold text- tracking-wide disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
          >
            {loading? 'Securing Your Acceptance...' : 'Agree to License & Activate Store'}
          </button>

          <p className="text-center text- text-zinc-500 mt-4 px-6">
            Secured by SalesTrack Pro • Your acceptance is logged for legal compliance
          </p>
        </div>
      </div>
    </div>
  )
}