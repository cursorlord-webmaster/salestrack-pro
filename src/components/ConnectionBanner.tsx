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
          Connection to your private cloud database & server is lost. You do not have an active internet connection. Fix it to restore access to your database and proceed.
        </span>
      </div>
    </div>
  )
}