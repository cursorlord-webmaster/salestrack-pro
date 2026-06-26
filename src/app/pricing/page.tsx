'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* LANDING HEADER - Fixed padding */}
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

      {/* PRICING SECTION */}
      <section className="max-w-6xl mx-auto px-5 py-12 md:py-16">
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 px-4">
            Simple & Transparent Pricing
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto px-4">
            One payment. Full year access. No hidden fees. No per-user charges.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          {/* PRO PLAN */}
          <div className="bg-gray-900 rounded-lg p-6 md:p-8 border border-gray-800 hover:border-[var(--primary)] hover:scale-105 transition-all text-center">
            <h3 className="text-xl md:text-2xl font-bold mb-2">Pro</h3>
            <p className="text-gray-400 mb-6 text-sm md:text-base">Perfect for single stores & supermarkets</p>
            
            <div className="mb-8">
              <span className="text-4xl md:text-3xl font-bold">₦200,000</span>
              <span className="text-gray-400 text-base md:text-lg">/year</span>
              <p className="text-gray-500 text-xs md:text-sm mt-2 leading-relaxed">
                Covers hosting, secure cloud database & backup, site maintenance and 24/7 support
              </p>
            </div>

            <Link href="https://wa.me/2349035984646?text=I%20want%20to%20subscribe%20to%20SalesTrack%20Pro%20Plan%20-%20NGN200,000/year">
              <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] hover:scale-105 text-white font-semibold py-4 rounded text-base transition-all mb-8">
                Get Started with Pro
              </Button>
            </Link>

            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">1 Store location</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Up to 5 staff accounts</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Full POS + Barcode scanning</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Inventory + Low stock alerts</span>
              </li>
			    <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Per second display of full store activity</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Daily sales & profit reports</span>
              </li>
			  <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">24/7 live store activity monitor from any location</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Full cloud backup</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Complete data security</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Email support</span>
              </li>
            </ul>
          </div>

          {/* ENTERPRISE PLAN */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 md:p-8 border-2 border-[var(--primary)] relative hover:scale-105 transition-all text-center">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-400 text-white px-4 py-1 rounded-full text-xs md:text-sm font-semibold">
              Most Popular
            </div>
            
            <h3 className="text-xl md:text-2xl font-bold mb-2">Enterprise</h3>
            <p className="text-gray-400 mb-6 text-sm md:text-base">For chain stores & multi-branch operations</p>
            
            <div className="mb-8">
              <span className="text-4xl md:text-3xl font-bold">₦350,000</span>
              <span className="text-gray-400 text-base md:text-lg">/year</span>
              <p className="text-gray-500 text-xs md:text-sm mt-2 leading-relaxed">
                Covers hosting, secure cloud database & backup, site maintenance and 24/7 support
              </p>
            </div>

            <Link href="https://wa.me/2349035984646?text=I%20want%20to%20subscribe%20to%20SalesTrack%20Pro%20Enterprise%20Plan%20-%20NGN350,000/year">
              <Button className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] hover:scale-105 text-white font-semibold py-4 rounded text-base transition-all mb-8">
                Get Started with Enterprise
              </Button>
            </Link>

            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base font-semibold">Unlimited store locations</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base font-semibold">Unlimited staff accounts</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base font-semibold">EVERYTHING in Pro plan + the following:</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Multi-branch analytics</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Priority WhatsApp support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">1-on-1 onboarding & training</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">API access for integrations</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm md:text-base">Custom report requests</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-12 md:mt-16 flex flex-col items-center gap-6">
          <p className="text-gray-400">
            Need help choosing?{" "}
              <a
                href="https://wa.me/2349035984646?text=I%20need%20help%20choosing%20a%20SalesTrack%20Pro%20plan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-semibold underline"
              >
                Chat with us
              </a>
          </p>
          
          <Link href="/">
            <Button className="bg-[#0f172a] hover:bg-gray-800 text-white font-semibold px-8 py-3 rounded text-base transition-all border border-white">
              Back to Homepage
            </Button>
          </Link>
        </div>
      </section>

      <style jsx>{`
        .landing-header {
          background: var(--gray-900);
          padding: 12px 0;
          border-bottom: 1px solid var(--gray-800);
        }

        .landing-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          justify-content: center;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>
    </div>
  )
}