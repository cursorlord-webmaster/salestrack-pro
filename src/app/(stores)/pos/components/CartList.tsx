'use client'

import { usePosStore } from '@/lib/pos/usePosStore'
import { Button } from '@/components/ui/button'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function CartList() {
  const { cart, updateQty, removeFromCart } = usePosStore()

  if (cart.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">Cart is empty</p>
        <p className="text-sm mt-1">Search and add products to start a sale</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cart.map((item) => (
        <div
          key={item.productId}
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
            <p className="text-sm font-medium text-green-600 mt-1">
              ₦{item.price.toLocaleString()} each
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => updateQty(item.productId, item.qty - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>

            <Input
              type="number"
              value={item.qty}
              onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 0)}
              className="w-16 h-8 text-center"
              min="1"
              max={item.stock}
            />

            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => updateQty(item.productId, item.qty + 1)}
              disabled={item.qty >= item.stock}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 sm:min-w-[120px]">
            <p className="font-bold text-right">
              ₦{(item.price * item.qty).toLocaleString()}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => removeFromCart(item.productId)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}