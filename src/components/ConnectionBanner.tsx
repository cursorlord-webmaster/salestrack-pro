'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(true)
  // Mobile-only collapse. useState only — NOT localStorage.
  // Resets on every new outage, so every cashier sees the full warning at least once.
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setIsCollapsed(false)
      window.location.reload() // Auto-refresh when back online
    }
    const handleOffline = () => {
      setIsOnline(false)
      setIsCollapsed(false) // New outage = show full warning again
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  // COLLAPSED STATE — Slim reminder bar
  if (isCollapsed) {
    return (
      <>
        {/* Mobile: slim 28px reminder — tap to expand again */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-0 left-0 right-0 z-[9999] md:hidden bg-red-600 text-white h- flex items-center justify-center gap-2"
        >
          <WifiOff className="h-3.5 w-3.5 animate-pulse" />
          <span className="font-bold text- tracking-wide">OFFLINE MODE — TAP TO VIEW</span>
        </button>
        {/* Desktop: never stays collapsed — always show full warning */}
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white hidden md:block">
          <div className="flex items-center justify-center gap-2 py-3 px-4">
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span className="font-medium text-sm">
              You are offline! <strong>EMERGENCY OFFLINE MODE IS ON.</strong> You can still search for your products and sell to customers. The Offline Mode is strictly an Emergency Sales Support feature to enable you continue with your sales during internet outages <strong>IF IT HAPPENS WHEN YOU ARE ON THE POS SALES PAGE.</strong> Please do not click to another page, refresh, log out, or close the app until you are done with sales. Reconnect to internet to restore FULL store functions!
            </span>
          </div>
        </div>
      </>
    )
  }

  // FULL WARNING — Shows on every new outage
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white">
      <div className="flex flex-col items-center justify-center gap-2 py-3 px-4">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span className="font-medium text-sm">
            You are offline! <strong>EMERGENCY OFFLINE MODE IS ON.</strong> You can still search for your products and sell to customers. The Offline Mode is strictly an Emergency Sales Support feature to enable you continue with your sales during internet outages <strong>IF IT HAPPENS WHEN YOU ARE ON THE POS SALES PAGE.</strong> Please do not click to another page, refresh, log out, or close the app until you are done with sales. Reconnect to internet to restore FULL store functions!
          </span>
        </div>
        {/* Mobile only — Desktop has no button, stays as before */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="md:hidden bg-white text-red-700 font-extrabold text-sm px-6 py-2 rounded-"
        >
          GOT IT - CONTINUE SELLING
        </button>
      </div>
    </div>
  )
}