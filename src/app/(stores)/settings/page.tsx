'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Lock, CheckCircle } from 'lucide-react'
import { logAudit } from '@/lib/audit/logAudit'

type Profile = {
  id: string
  role: string
  store_id: string
  full_name: string
  email: string
}

type Store = {
  id: string
  name: string
  created_at: string
  license_expires_at: string | null 
  is_active: boolean
}

type StoreSettings = {
  store_address: string | null
  store_phone: string | null
  low_stock_threshold: number
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRestrictedModal, setShowRestrictedModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  
  // Store form
  const [storeAddress, setStoreAddress] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  const [settingsLoading, setSettingsLoading] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/client-login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, role, store_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profileData) {
      setLoading(false)
      return
    }

    setProfile(profileData)

    // GUARD: Only store_owner can access
    if (profileData.role !== 'store_owner') {
      setShowRestrictedModal(true)
      setLoading(false)
      setTimeout(() => router.push('/dashboard'), 2000)
      return
    }

    // Fetch store info
const { data: storeData } = await supabase
  .from('stores')
  .select('id, name, created_at, license_expires_at, is_active')
  .eq('id', profileData.store_id)
  .single()

    if (storeData) setStore(storeData)

    // Fetch store settings
    const { data: settingsData } = await supabase
      .from('store_settings')
      .select('store_address, store_phone, low_stock_threshold')
      .eq('store_id', profileData.store_id)
      .single()

    if (settingsData) {
      setSettings(settingsData)
      setStoreAddress(settingsData.store_address || '')
      setStorePhone(settingsData.store_phone || '')
      setLowStockThreshold(settingsData.low_stock_threshold || 10)
    }

    setLoading(false)
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields required')
      return
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      toast.error('Failed to update password', { description: error.message })
      setPasswordLoading(false)
      return
    }

    await logAudit('UPDATE', 'Password changed', 'settings')
    toast.success('Password updated successfully')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordLoading(false)
  }

async function saveSettings() {
  if (!profile?.store_id || !store?.name) {
    toast.error('Store info not loaded')
    return
  }

  setSettingsLoading(true)

  const { error } = await supabase
    .from('store_settings')
    .upsert({
      store_id: profile.store_id,
      store_name: store.name, // Required field
      store_address: storeAddress || null,
      store_phone: storePhone || null,
      store_email: profile.email, // Optional but good to populate
      low_stock_threshold: lowStockThreshold,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'store_id' // Update if row exists, insert if not
    })

  if (error) {
    toast.error('Failed to save settings', { description: error.message })
    setSettingsLoading(false)
    return
  }

  await logAudit('UPDATE', 'Store settings updated', 'settings')
  setSettingsLoading(false)
  setShowSuccessModal(true)
}

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading settings...</div>
      </div>
    )
  }

  if (!profile || profile.role !== 'store_owner') {
    return null
  }

const daysLeft = store?.license_expires_at
  ? Math.max(0, Math.ceil((new Date(store.license_expires_at).getTime() - Date.now()) / 86400000))
  : null

const isExpired = store?.license_expires_at ? new Date(store.license_expires_at) < new Date() : false

  return (
    <div className="space-y-6">
      {/* Client / Store Overview */}
      <Card className="bg-white border-slate-200 rounded">
        <CardHeader className="border-b border-slate-200">
          <div className="text-center">
            <CardTitle className="text-xl font-semibold text-slate-900">
              Client - Store Overview
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Your store's database information and license details
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Store Name</p>
              <h3 className="font-semibold text-slate-900 text-sm">{store?.name || '-'}</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Store ID</p>
              <h3 className="font-semibold text-slate-900 text-sm">{store?.id?.slice(0, 8) || '-'}</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Owner Name</p>
              <h3 className="font-semibold text-slate-900 text-sm">{profile.full_name}</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Email Address</p>
              <h3 className="font-semibold text-slate-900 text-sm">{profile.email}</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Created</p>
              <h3 className="font-semibold text-slate-900 text-sm">
               {store?.created_at ? formatDateTime(store.created_at) : '-'}
              </h3>
            </div>
            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Expiry</p>
              <h3 className="font-semibold text-slate-900 text-sm">
                {store?.license_expires_at ? formatDateTime(store.license_expires_at) : 'Lifetime'}
              </h3>
            </div>
            {daysLeft !== null && (
              <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-1">Days Remaining</p>
                <h3 className={`font-bold text-lg ${daysLeft <= 3 ? 'text-red-600' : 'text-green-600'}`}>
                  {daysLeft} Days
                </h3>
              </div>
            )}
<div className={`p-4 rounded border text-center ${store?.is_active && !isExpired ? 'bg-green-600' : 'bg-red-600'}`}>
  <p className="text-xs text-white mb-1 font-semibold">Status</p>
  <h3 className="font-bold text-lg text-white tracking-wider">
    {store?.is_active && !isExpired ? 'ACTIVE' : 'EXPIRED'}
  </h3>
</div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
<Card className="bg-white border-slate-200 rounded">
  <CardHeader>
    <CardTitle className="text-base text-slate-900 text-center">Change Login Password</CardTitle>
    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center text-sm text-blue-800">
Update your account password. Keep it secure and do not share with anyone. SalesTrack Pro cannot see your settings, store activities or data after you change your password because your new password will be protected with AES 256 byte Encryption and cannot be hacked. 
Your store is exclusively your private property which is secure and can only be accessed by those you grant login access as stated on our privacy policy page. IF YOU LOSE OR FORGET YOUR NEW PASSWORD THAT YOU CREATE BY YOURSELF, we cannot retrieve it for you because we simply do not have it. 
So please copy it and keep it somewhere safe. Your store data on your private / dedicated cloud server is also secure and locked. SalesTrack Pro uses AES-256 encryption. If you lose your password, we cannot retrieve it for you.

    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword" className="text-center block">Current Password *</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password"
          autoComplete="current-password"
          className="text-center"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-center block">New Password *</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 6 characters"
          autoComplete="new-password"
          className="text-center"
        />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-center block">Confirm New Password *</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          className="text-center"
        />
      </div>
      <div className="flex items-end">
        <Button
          onClick={changePassword}
          disabled={passwordLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          {passwordLoading ? 'Updating...' : 'Update Password'}
        </Button>
      </div>
    </div>
  </CardContent>
</Card>

{/* Store Settings */}
<Card className="bg-white border-slate-200 rounded">
  <CardHeader>
    <CardTitle className="text-base text-slate-900 text-center">Store Settings</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="storeAddress" className="text-center block">Store Address</Label>
        <Input
          id="storeAddress"
          value={storeAddress}
          onChange={(e) => setStoreAddress(e.target.value)}
          placeholder="Enter store address"
          className="text-center"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="storePhone" className="text-center block">
          Phone Number <span className="text-xs text-slate-400">(Optional)</span>
        </Label>
        <Input
          id="storePhone"
          value={storePhone}
          onChange={(e) => setStorePhone(e.target.value)}
          placeholder="e.g. 08012345678"
          className="text-center"
        />
        <p className="text-xs text-slate-500 text-center">
          If provided, this number will appear on printed receipts.
        </p>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="lowStock" className="text-center block">Low Stock Threshold</Label>
        <Input
          id="lowStock"
          type="number"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
          className="text-center"
        />
      </div>
      <div className="flex items-end justify-center">
		<Button
          onClick={saveSettings}
          disabled={settingsLoading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {settingsLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
      {/* Restricted Modal */}
      <Dialog open={showRestrictedModal} onOpenChange={setShowRestrictedModal}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <Lock className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <DialogHeader>
              <DialogTitle className="text-center text-red-600">Restricted Access</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600 mt-2 mb-1">
              Settings Page Is Reserved For The Store Owner Only.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              This section contains your SalesTrack Pro license details, store credentials, and vital configurations.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="bg-cyan-500 hover:bg-cyan-600">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <DialogHeader>
              <DialogTitle className="text-center">Settings Saved</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600 mt-2 mb-6">
              Your changes have been updated successfully.
            </p>
            <Button onClick={() => setShowSuccessModal(false)} className="bg-cyan-500 hover:bg-cyan-600">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}