'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductSearch } from './components/ProductSearch'
import { CartList } from './components/CartList'
import { CartSummary } from './components/CartSummary'
import { ReceiptDialog } from './components/ReceiptDialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { usePosStore } from '@/lib/pos/usePosStore'
import { useCheckout } from '@/lib/pos/usePOS'

const queryClient = new QueryClient()

function PosPageContent() {
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const { cart, discount, paymentType, total } = usePosStore()
  const checkout = useCheckout()

  const handleCheckout = () => {
    if (cart.length === 0) return

    const saleTotal = total()
    const saleDiscount = discount

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
      total: saleTotal
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
      <Toaster />
    </QueryClientProvider>
  )
}