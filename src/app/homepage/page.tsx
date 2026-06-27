'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'

export default function Homepage() {
const [mounted, setMounted] = useState(false)
const trackRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  setMounted(true)
}, [])

useEffect(() => {
  setMounted(true)
}, [])

useEffect(() => {
  if (!mounted) return

  const track = trackRef.current
  if (!track) return

  let position = 0
  let animationId: number
  const speed = window.innerWidth < 768? 0.3 : 0.6

  const slide = () => {
    if (!track) return
    position -= speed
    if (position <= -track.scrollWidth / 2) {
      position = 0
    }
    track.style.transform = `translateX(${position}px)`
    animationId = requestAnimationFrame(slide)
  }

  animationId = requestAnimationFrame(slide)
  return () => cancelAnimationFrame(animationId)
}, [mounted])

if (!mounted) {
    return <div className="min-h-screen bg-[#0f172a]" />
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --primary: #1e40af;
          --primary-dark: #1e3a8a;
          --primary-light: #3b82f6;
          --success: #16a34a;
          --danger: #dc2626;
          --warning: #f59e0b;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          --radius: 8px;
          --transition: all 0.2s ease;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #0f172a;
          color: var(--gray-900);
          line-height: 1.5;
          overflow-x: hidden;
        }

        .hidden { display: none !important; }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          cursor: pointer;
          transition: background 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) { 
          background: var(--primary-dark);
        }
		
.value-prop {
  background: transparent;
  padding: 20px 20px 0;
  border-bottom: none;
}

.value-prop-inner {
  max-width: calc(100% - 100px);
  margin: 0 auto;
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
  padding: 28px 32px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
}

.value-prop h2 {
  color: white;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  letter-spacing: -0.3px;
}

.value-prop .highlight {
  color: #eddb13;
  font-weight: 700;
}

@media (max-width: 768px) {
  .value-prop {
    padding: 24px 20px;
  }
  .value-prop h2 {
    font-size: 18px;
    line-height: 1.5;
  }
  .value-prop-inner {
  max-width: calc(100% - 0px);
  padding: 24px 20px;
  border-radius: 6px;
}
}

        .login-cta {
          background: var(--gray-900);
          padding: 40px 20px;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .login-cta .btn-lg {
          padding: 6px 16px;
          font-size: 16px;
          font-weight: 600;
        }

        .login-cta .btn-lg:hover {
          background: var(--primary-dark);
        }

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

        .brand h1 {
          color: white;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .hero {
          background: var(--gray-900);
          color: white;
          padding: 10px 20px 30px;
          text-align: center;
        }

        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
        }

        .hero h2 {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .hero-sub {
          color: var(--gray-300);
          font-size: 18px;
          margin-bottom: 40px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          text-align: center;
          margin-bottom: 30px;
        }

        .feature-card {
          background: var(--gray-800);
          border: 1px solid var(--gray-700);
          border-radius: var(--radius);
          padding: 16px 14px;
          box-shadow: var(--shadow-lg);
          transition: var(--transition);
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow: hidden;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: var(--primary);
        }

        .feature-card h3 {
          color: white;
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
          text-align: center;
          flex-shrink: 0;
        }

        .feature-card ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: inline-block;
          text-align: left;
        }

        .feature-card li {
          color: var(--gray-300);
          font-size: 12px;
          padding: 3px 0 3px 20px;
          line-height: 1.5;
          position: relative;
        }

        .feature-card li:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--success);
          font-weight: 700;
          font-size: 13px;
          top: 3px;
        }

        .testimonials {
          padding: 30px 0 60px;
          background: #0f172a;
          text-align: center;
          color: white;
          width: 100%;
        }

        .testimonials h2 {
          font-size: 28px;
          margin-bottom: 10px;
          padding: 0 20px;
        }

        .testimonial-slider {
          overflow: hidden;
          width: 100%;
          margin: 30px auto 0;
        }

        .testimonial-track {
          display: flex;
          gap: 15px;
          padding: 0 20px;
        }

        .testimonial-card {
          min-width: 280px;
          background: #f8fafc;
          color: var(--gray-900);
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
          border: 1px solid var(--gray-200);
        }

        .testimonial-card p {
          font-style: italic;
          margin-bottom: 12px;
          line-height: 1.6;
        }

        .testimonial-card h4 {
          color: var(--primary);
          font-weight: 600;
          font-size: 14px;
        }

        .landing-footer {
          background: var(--gray-900);
          color: var(--gray-500);
          padding: 30px 20px;
          border-top: 1px solid var(--gray-800);
        }

        .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          text-align: center;
        }

        .footer-links {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .footer-links a {
          color: var(--gray-400);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: var(--primary-light);
        }

        @media (max-width: 1024px) {
          .feature-grid { grid-template-columns: repeat(2, 1fr); }
          .feature-card { min-height: 220px; }
        }

        @media (max-width: 768px) {
          .hero h2 { font-size: 28px; }
          .feature-grid { grid-template-columns: 1fr; }
          .feature-card { min-height: auto; }
          .testimonial-card { min-width: 260px; }
        }

        @media (max-width: 640px) {
          .footer-inner {
            flex-direction: column;
            text-align: center;
          }
        }

        .mobile-highlight {
          max-width: 1000px;
          margin: 0 auto 40px;
          padding: 28px 24px;
          background: var(--gray-800);
          border: 1px solid var(--gray-700);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          text-align: center;
          margin-bottom: 12px;
        }

        .mobile-icons {
          color: var(--gray-300);
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 14px;
        }

        .mobile-highlight h3 {
          color: white;
          font-size: 24px;
          margin-bottom: 12px;
        }

        .mobile-highlight p {
          color: var(--gray-300);
          font-size: 16px;
          line-height: 1.7;
        }

        .page-shell {
          background: #0f172a;
          padding: 40px 0;
        }
      `}</style>

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
	  
	  {/* VALUE PROP HERO */}
<section className="value-prop">
  <div className="value-prop-inner">
<h2>
  Track every sale in your store. Stop profit leaks and staff fraud.{' '}
  <span className="highlight">Boost your store's productivity and performance</span> while you watch from anywhere!
</h2>
  </div>
</section>

      {/* CLIENT LOGIN CTA */}
      <div className="login-cta">
        <Link href="/client-login">
          <Button className="btn btn-primary btn-lg">
            Client Login
          </Button>
        </Link>
      </div>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-inner">
          <h2>Core Features Of SalesTrack Pro</h2>
          <p className="hero-sub">Store POS + Inventory + Accounting + Auditing + Analytics. Your Intelligent All-In-One Suite Built For Profit & Full Control</p>
          
          <div className="feature-grid">
            {/* 1. Inventory Intelligence */}
            <div className="feature-card">
              <h3>Inventory Intelligence</h3>
              <ul>
                <li>Store product registration</li>
                <li>Categories & Suppliers</li>
                <li>Reorder levels + thresholds</li>
                <li>Stock health states</li>
                <li>Barcode scanning support</li>
              </ul>
            </div>

            {/* 2. POS / Sales Engine */}
            <div className="feature-card">
              <h3>POS / Sales Engine</h3>
              <ul>
                <li>Live product search</li>
                <li>Cart + Quantity controls</li>
                <li>Discounts & Payments</li>
                <li>Receipt numbering</li>
                <li>Real-time qty revalidation</li>
              </ul>
            </div>

            {/* 3. Financial Intelligence */}
            <div className="feature-card">
              <h3>Financial Intelligence</h3>
              <ul>
                <li>Gross & Net profit</li>
                <li>Margin calculations</li>
                <li>Revenue analytics</li>
                <li>Real-time profit tracking</li>
                <li>Professional report page</li>
              </ul>
            </div>

            {/* 4. Analytics & Dashboard */}
            <div className="feature-card">
              <h3>Analytics & Dashboard</h3>
              <ul>
                <li>Daily revenue & profit</li>
                <li>Customer count</li>
                <li>Fast-moving products</li>
                <li>Low-stock indicators</li>
                <li>24/7 sales calculations</li>
              </ul>
            </div>

            {/* 5. Audit & Accountability */}
            <div className="feature-card">
              <h3>Audit & Accountability</h3>
              <ul>
                <li>Audit trail logging</li>
                <li>User activity tracking</li>
                <li>Before/after state logging</li>
                <li>Login logging</li>
                <li>Stale-cart protection</li>
              </ul>
            </div>

            {/* 6. Staff System */}
            <div className="feature-card">
              <h3>Staff System</h3>
              <ul>
                <li>Roles: owner, manager, cashier</li>
                <li>Permission gating</li>
                <li>Role restrictions</li>
                <li>Oversell prevention</li>
                <li>Out-of-stock interception</li>
              </ul>
            </div>

            {/* 7. Smart Operations */}
            <div className="feature-card">
              <h3>Smart Operations</h3>
              <ul>
                <li>Remote store monitoring</li>
                <li>Full cloud backup</li>
                <li>58mm receipt printing</li>
                <li>Complete data security</li>
                <li>Multi-store support</li>
              </ul>
            </div>

            {/* 8. Technical Core */}
            <div className="feature-card">
<h3 className="text-xl font-bold text-slate-900 mb-3">Technical Core</h3>
<ul className="space-y-2 text-slate-600">
  <li>Connection guard</li>
  <li>Real-time cloud sync</li>
  <li>Auth security via Supabase</li>
  <li>Responsive mobile layout</li>
  <li>Modern UI + Modals</li>
</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="mobile-highlight">
          <div className="mobile-icons">
            📱 Optimized For Android & iPhone • 🖨 Clean Receipt Printing - Works With Mini Bluetooth Printers
          </div>

          <h3>Run Your Entire Store From Your Phone</h3>

          <p>
            SalesTrack Pro is a complete Store ERP + POS system that works seamlessly on Android and iPhone devices.
            Your staff can log in using their dedicated login details, search store products, add items to cart, make sales, 
            track inventory, and print clean 58mm receipts using portable Bluetooth thermal printers - all without needing a laptop or desktop computer running all day. You monitor your store's entire operation from your phone, anywhere in the world.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <h2>User Feed Back</h2>
        <div className="testimonial-slider">
          <div className="testimonial-track" ref={trackRef}>
            {/* CARD SET 1 */}
            <div className="testimonial-card">
              <p>“SalesTrack Pro is enterprise grade software for any supermarket and store. Awesome engineering.”</p>
              <h4>- CityMart, Lagos</h4>
            </div>
            <div className="testimonial-card">
              <p>“My cashiers love the simple POS sales feature on the first day of testing. Sales are 3x faster and receipts are clean.”</p>
              <h4>- MegaShop Plus, River State</h4>
            </div>
            <div className="testimonial-card">
              <p>“We run 3 shifts. The audit trail feature shows exactly who sold what. This means we will no longer have missing stock.”</p>
              <h4>- Family Supermarket, Abuja</h4>
            </div>
            <div className="testimonial-card">
              <p>“Simply love it. Now I see and track everything happening live in my store on my phone screen - even on the road. Powerful!”</p>
              <h4>- Kingsway Stores, Enugu</h4>
            </div>
            <div className="testimonial-card">
              <p>“It's simply amazing. It displays profits and more on every single item sold in my shop right on my Android 24/7. Highly recommend!”</p>
              <h4>- Daily Needs Store, Ibadan</h4>
            </div>
            <div className="testimonial-card">
              <p>“The amazing part is that the software works on our phones. My supermarket staff logs in and makes sales from their phones and also print receipts. Lovely!”</p>
              <h4>- ValueMart, Calabar</h4>
            </div>

            {/* DUPLICATED SET FOR LOOP */}
            <div className="testimonial-card">
              <p>“SalesTrack Pro is enterprise grade software for any supermarket and store. Awesome engineering.”</p>
              <h4>- CityMart, Lagos</h4>
            </div>
            <div className="testimonial-card">
              <p>“My cashiers love the simple POS sales feature on the first day of testing. Sales are 3x faster and receipts are clean.”</p>
              <h4>- MegaShop Plus, River State</h4>
            </div>
            <div className="testimonial-card">
              <p>“We run 3 shifts. The audit trail feature shows exactly who sold what. This means we will no longer have missing stock.”</p>
              <h4>- Family Supermarket, Abuja</h4>
            </div>
            <div className="testimonial-card">
              <p>“Simply love it. Now I see and track everything happening live in my store on my phone screen - even on the road. Powerful!”</p>
              <h4>- Kingsway Stores, Enugu</h4>
            </div>
            <div className="testimonial-card">
              <p>“It's simply amazing. It displays profits and more on every single item sold in my shop right on my Android 24/7. Highly recommend!”</p>
              <h4>- Daily Needs Store, Ibadan</h4>
            </div>
            <div className="testimonial-card">
              <p>“The amazing part is that the software works on our phones. My supermarket staff logs in and makes sales from their phones and also print receipts. Lovely!”</p>
              <h4>- ValueMart, Calabar</h4>
            </div>
          </div>
        </div>
		
		    <div className="h-20 w-full block"></div>
		
		 {/* DEMO + PRICING CTA */}
        <div className="w-full flex flex-col items-center gap-4 mt-16 px-5">
          <a
            href="https://wa.me/2349035984646?text=I%20need%20access%20to%20test%20SalesTrack%20Pro"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-[280px] bg-[var(--primary)] hover:bg-[var(--primary-dark)] hover:scale-105 text-white font-semibold px-8 py-4 rounded text-base transition-all text-center shadow-lg hover:shadow-xl"
          >
            Request Demo Access
          </a>
          <p className="text-gray-400 text-sm text-center max-w-md">
            Chat with us on WhatsApp for instant access to our live demo store. Test all features before you grab your own store.
          </p>

          <Link href="/pricing" className="w-full max-w-[280px] mt-2">
            <Button className="w-full bg-[#0f172a] hover:bg-gray-800 hover:scale-105 text-white font-semibold px-8 py-4 rounded text-base transition-all border border-gray-700 hover:border-gray-500 shadow-lg hover:shadow-xl">
              View Pricing & Plans
            </Button>
          </Link>
        </div>
		
      </section>
	  

      <footer className="landing-footer">
        <div className="footer-inner">
          <p>© 2026 SalesTrack Pro. Built & Powered By CursorLord Systems.</p>
          <div className="footer-links">
            <Link href="/terms">Terms & Conditions</Link>
            <span>•</span>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </>
  )
}