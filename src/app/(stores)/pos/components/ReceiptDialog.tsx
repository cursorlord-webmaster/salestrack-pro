'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Printer } from 'lucide-react'
import { CartItem } from '@/lib/pos/usePosStore'
import { printReceipt } from '@/lib/pos/print'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

function formatReceiptDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  
  hours = hours % 12
  hours = hours ? hours : 12 // 0 should be 12
  const hoursStr = String(hours).padStart(2, '0')
  
  return `${day}/${month}/${year}, ${hoursStr}:${minutes}${ampm}`
}

type ReceiptProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  discount: number
  total: number
  paymentType: string
  saleId?: string
  saleDate?: Date
}

type StoreInfo = {
  name: string
  address: string | null
  phone: string | null
}

export function ReceiptDialog({
  open,
  onOpenChange,
  items,
  discount,
  total,
  paymentType,
  saleId,
  saleDate = new Date()
}: ReceiptProps) {
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    name: 'SalesTrack Pro',
    address: null,
    phone: null
  })
  const supabase = createClient()

  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.qty || 0), 0)

  useEffect(() => {
    if (open) {
      fetchStoreInfo()
    }
  }, [open])

  async function fetchStoreInfo() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
     .from('profiles')
     .select('store_id')
     .eq('id', user.id)
     .single()

    if (!profile?.store_id) return

    const [{ data: store }, { data: settings }] = await Promise.all([
      supabase
       .from('stores')
       .select('name')
       .eq('id', profile.store_id)
       .single(),
      supabase
       .from('store_settings')
       .select('store_address, store_phone')
       .eq('store_id', profile.store_id)
       .single()
    ])

    setStoreInfo({
      name: store?.name || 'SalesTrack Pro',
      address: settings?.store_address || null,
      phone: settings?.store_phone || null
    })
  }

  const handlePrint = () => {
    printReceipt(
      {
        saleId: saleId || crypto.randomUUID(),
        storeName: storeInfo.name,
        storeAddress: storeInfo.address || '',
        storePhone: storeInfo.phone || '',
        items: items.map(i => ({
          name: i.name || 'Unnamed Item',
          qty: i.qty || 0,
          unitPrice: i.price || 0,
          total: (i.price || 0) * (i.qty || 0)
        })),
        subtotal,
        discount,
        total,
        paymentType,
        date: saleDate
      },
      storeInfo.address,
      storeInfo.phone
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Receipt Preview</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="text-xs font-mono space-y-1">
            <div className="text-center font-bold">{storeInfo.name.toUpperCase()}</div>
            <div className="text-center">Point of Sale</div>
            {storeInfo.address && (
              <div className="text-center text-muted-foreground">{storeInfo.address}</div>
            )}
            {storeInfo.phone && (
              <div className="text-center text-muted-foreground">Tel: {storeInfo.phone}</div>
            )}
            <Separator className="my-2" />

            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatReceiptDate(saleDate)}</span>
            </div>
            {saleId && (
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span>{saleId.slice(-8).toUpperCase()}</span>
              </div>
            )}

            <Separator className="my-2" />

            {items.map((item) => {
              const name = item.name?.replace(/\s*\([^)]*\)\s*$/, '') || 'Unnamed Item'
              const qty = item.qty || 0
              const price = item.price || 0
              return (
                <div key={item.productId}>
                  <div>{name}</div>
                  <div className="flex justify-between">
                    <span>{qty} x ₦{price.toLocaleString()}</span>
                    <span>₦{(price * qty).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}

            <Separator className="my-2" />

            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₦{discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>TOTAL:</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="capitalize">{paymentType}</span>
            </div>

            <Separator className="my-2" />
            <div className="text-center">Thank you for your patronage!</div>
            <div className="text-center italic text-muted-foreground">Built & Powered by Cursorlord Systems</div>
          </div>
        </ScrollArea>

        <Button onClick={handlePrint} className="w-full">
          <Printer className="mr-2 h-4 w-4" />
          Print 58mm Receipt
        </Button>
      </DialogContent>
    </Dialog>
  )
}