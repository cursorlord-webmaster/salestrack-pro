'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { usePosStore } from '@/lib/pos/usePosStore'

export function CartSummary({ onCheckout }: { onCheckout: () => void }) {
  const { cart, discount, setDiscount, paymentType, setPaymentType, subtotal, total } = usePosStore()

  const subtotalAmount = subtotal()
  const totalAmount = total()

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">₦{subtotalAmount.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="discount" className="text-sm text-muted-foreground">
            Discount
          </Label>
          <Input
            id="discount"
            type="number"
            min="0"
            max={subtotalAmount}
            value={discount || ''}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            className="h-8 w-24 text-right"
            placeholder="0"
          />
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>₦{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Select value={paymentType} onValueChange={setPaymentType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={cart.length === 0 || totalAmount <= 0}
        onClick={onCheckout}
      >
        Checkout ₦{totalAmount.toLocaleString()}
      </Button>
    </div>
  )
}