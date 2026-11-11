'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductSearch } from './components/ProductSearch'
import { CartList } from './components/CartList'
import { CartSummary } from './components/CartSummary'
import { ReceiptDialog } from './components/ReceiptDialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePosStore } from '@/lib/pos/usePosStore'
import { useCheckout } from '@/lib/pos/usePOS'
import { toast } from 'sonner'
import { addToOfflineQueue, decrementCacheQuantity, getOfflineQueue, removeFromOfflineQueue } from '@/lib/offline/db'

const queryClient = new QueryClient()

function PosPageContent() {
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const { cart, discount, paymentType, total, ensureCheckoutKey, clearCart } = usePosStore()
  const checkout = useCheckout()
  const isSyncingRef = useRef(false)

  // SYNC OFFLINE QUEUE — runs on load + when internet returns
  useEffect(() => {
    const syncQueue = async () => {
      if (!navigator.onLine) return
      if (isSyncingRef.current) return
      isSyncingRef.current = true
      try {
        const store_id = localStorage.getItem('salestrack_store_id') || ''
        if (!store_id) return
        const queue = await getOfflineQueue(store_id)
        if (queue.length === 0) return
        let syncedCount = 0
        for (const queued of queue) {
          try {
            await checkout.mutateAsync({
              ...queued.payload,
              created_at: queued.created_at,
              is_sync: true
            })
            await removeFromOfflineQueue(store_id, queued.idempotency_key)
            syncedCount++
          } catch (e) {
            // Stop on first failure (WiFi dropped again) — rest stays in queue for next retry
            break
          }
        }
        if (syncedCount > 0) {
          toast.success(`${syncedCount} offline sale${syncedCount > 1 ? 's' : ''} synced`)
        }
      } catch {}
      finally {
        isSyncingRef.current = false
      }
    }
    syncQueue()
    const handleOnline = () => syncQueue()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const handleCheckout = async () => {
    if (cart.length === 0) return
    if (checkout.isPending) return // Block double-click while first checkout is still flying

    const saleTotal = total()
    const saleDiscount = discount
    const idempotency_key = ensureCheckoutKey() // Same key for this cart, every retry

    // OFFLINE CHECKOUT — early return, online flow below untouched
    if (!navigator.onLine) {
      const store_id = localStorage.getItem('salestrack_store_id') || ''
      const staff_id = localStorage.getItem('salestrack_staff_id') || ''
      const staff_name = localStorage.getItem('salestrack_staff_name') || ''
      if (!store_id) {
        toast.error('Offline data not ready — please go online once and reload, then try again')
        return
      }
      const payload = {
        items: cart.map(item => ({
          product_id: item.productId,
          product_name: item.name,
          quantity: item.qty,
          unit_price: item.price,
          cost_price: item.costPrice
        })),
        payment_method: paymentType as 'cash' | 'pos' | 'transfer',
        discount: saleDiscount,
        subtotal: saleTotal + saleDiscount,
        total: saleTotal,
        idempotency_key
      }
      for (const item of cart) {
        await decrementCacheQuantity(store_id, item.productId, item.qty)
      }
      await addToOfflineQueue(store_id, {
        idempotency_key,
        store_id,
        staff_id,
        staff_name,
        payload,
        created_at: new Date().toISOString(),
        synced: false
      })
      const receiptNo = idempotency_key.replace(/-/g, '').slice(0, 8).toUpperCase()
      setLastSale({
        saleId: receiptNo,
        items: [...cart],
        discount: saleDiscount,
        total: saleTotal,
        paymentType,
        saleDate: new Date()
      })
      setReceiptOpen(true)
      clearCart()
      toast.success('Sale completed (Offline) — will sync when internet returns')
      return
    }

    const payload = {
      items: cart.map(item => ({
        product_id: item.productId,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        cost_price: item.costPrice
      })),
      payment_method: paymentType,
      discount: saleDiscount,
      subtotal: saleTotal + saleDiscount,
      total: saleTotal,
      idempotency_key
    }

    checkout.mutate(payload, {
      onSuccess: (data) => {
        setLastSale({
          saleId: data.sale_id,
          items: [...cart],
          discount: saleDiscount,
          total: saleTotal,
          paymentType,
          saleDate: new Date()
        })
        setReceiptOpen(true)
      }
    })
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Search Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProductSearch />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Cart</CardTitle>
            </CardHeader>
            <CardContent>
              <CartList />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-center">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <CartSummary
                onCheckout={handleCheckout}
                isProcessing={checkout.isPending}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {lastSale && (
        <ReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          items={lastSale.items}
          discount={lastSale.discount}
          total={lastSale.total}
          paymentType={lastSale.paymentType}
          saleId={lastSale.saleId}
          saleDate={lastSale.saleDate}
        />
      )}
    </div>
  )
}

export default function PosPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PosPageContent />
    </QueryClientProvider>
  )
}