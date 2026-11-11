'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      window.location.reload() // Auto-refresh when back online
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white">
      <div className="flex items-center justify-center gap-2 py-3 px-4">
        <WifiOff className="h-4 w-4 animate-pulse" />
<span className="font-medium text-sm">
  You are offline! <strong>EMERGENCY OFFLINE MODE IS ON.</strong> You can still search for your products and sell to customers. The Offline Mode is strictly an Emergency Sales Support feature to enable you continue with your sales during internet outages <strong>IF IT HAPPENS WHEN YOU ARE ON THE POS SALES PAGE.</strong> Please do not click to another page, refresh, log out, or close the app until you are done with sales. Reconnect to internet to restore FULL store functions!
</span>
      </div>
    </div>
  )
}