// src/app/(stores)/layout-client.tsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  FileText,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { logAudit } from '@/lib/audit/logAudit'
import { ConnectionBanner } from '@/components/ConnectionBanner'

// SalesTrack modules - no expiry/batch per blueprint
const MODULES = [
  { name: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'inventory', label: 'Inventory', icon: Package, href: '/inventory' },
  { name: 'pos', label: 'POS / Sales', icon: ShoppingCart, href: '/pos' },
  { name: 'sales', label: 'Sales History', icon: Receipt, href: '/sales' },
  { name: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
  { name: 'audit', label: 'Audit Trail', icon: FileText, href: '/audit' },
  { name: 'staff', label: 'Staff Management', icon: Users, href: '/staff' },
  { name: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
]

// SalesTrack RBAC per your blueprint
const PERMISSIONS = {
  store_owner: {
    pages: ['dashboard', 'pos', 'inventory', 'sales', 'reports', 'audit', 'staff', 'settings'],
    actions: ['create', 'read', 'update', 'delete', 'export']
  },
  manager: {
    pages: ['dashboard', 'pos', 'inventory', 'sales', 'reports', 'audit', 'staff'],
    actions: ['read', 'export', 'create', 'update', 'delete'] // no password reset
  },
  cashier: {
    pages: ['pos', 'sales', 'inventory'], // sales = history only, inventory = view only
    actions: ['read']
  },
}

type Profile = {
  id: string;
  role: 'store_owner' | 'manager' | 'cashier';
  active: boolean;
  store_id: string;
  full_name: string;
  email: string;
};

type Store = {
  id: string;
  name: string;
  status: string;
  license_expires_at: string;
};

interface StoreLayoutClientProps {
  children: React.ReactNode;
  profile: Profile;
  store: Store;
}

export default function StoreLayoutClient({ children, profile, store }: StoreLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

async function handleLogout() {
  try {
    // Fire audit first and wait for it
    const { error } = await supabase.from('audit_logs').insert({
      store_id: profile.store_id,
      user_id: profile.id,
      user_full_name: profile.full_name,
      action: 'LOGOUT',
      entity: 'auth',
      details: 'User logged out',
      created_at: new Date().toISOString()
    })
    
    if (error) console.error('Logout audit failed:', error)
  } catch (e) {
    console.error('Logout audit error:', e)
  }
  
  // Only sign out after audit is done
  await supabase.auth.signOut()
  router.push('/client-login')
}

  function canAccessPage(moduleName: string) {
    const perms = PERMISSIONS[profile.role]
    return perms ? perms.pages.includes(moduleName) : false
  }

  const visibleModules = MODULES.filter(m => canAccessPage(m.name))
  const currentModule = MODULES.find(m => pathname === m.href)

  return (
    <>
      <ConnectionBanner />
      <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar - Navy like MedsTrack */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800 text-center">
          <div className="flex items-center justify-center mb-3.5">
            <img 
              src="/landing-logo.png" 
              alt="SalesTrack Pro" 
              className="h-20 w-auto object-contain"
            />
          </div>
          <div className="flex justify-center mb-2">
            <span 
              className="inline-block px-3 py-0.5 text-xs uppercase tracking-wider font-semibold text-white bg-orange-600 border border-orange-500"
              style={{ 
                fontFamily: 'Calibri, "Segoe UI", sans-serif',
                borderRadius: '4px' 
              }}
            >
              Client
            </span>
          </div>
          <div className="text-base font-bold text-slate-100 leading-snug break-words">
            {store.name}
          </div>
        </div>


        {/* User Info */}
        <div className="px-6 py-4 border-b border-slate-800 text-center">
          <div className="text-sm font-medium text-slate-200">{profile.full_name}</div>
          <div className="text-xs text-slate-400 capitalize">
            {profile.role.replace('_', ' ')}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleModules.map((module) => {
            const isActive = pathname === module.href
            return (
              <Link key={module.name} href={module.href} onClick={() => setSidebarOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-slate-100 rounded h-10",
                    isActive && "bg-slate-800 text-cyan-400"
                  )}
                >
                  <module.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{module.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500 leading-relaxed">
          SalesTrack Pro<br />Powered by CursorLord Systems
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header with Hamburger */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
  variant="ghost"
  size="icon"
  className="lg:hidden rounded text-slate-900 hover:bg-slate-100"
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
</Button>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex-1 text-center">
            {currentModule?.label || 'POS'}
          </h1>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-600 hover:text-slate-900 rounded"
          >
            
            Logout
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
    </>
  )
}