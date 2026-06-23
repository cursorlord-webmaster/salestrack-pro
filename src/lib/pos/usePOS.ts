import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePosStore } from './usePosStore'
import { toast } from 'sonner'
import { logAudit } from '@/lib/audit/logAudit' // ← ONLY NEW IMPORT

type CheckoutPayload = {
  items: {
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    cost_price: number
  }[]
  payment_method: 'cash' | 'pos' | 'transfer'
  discount: number
  subtotal: number
  total: number
}

export function useCheckout() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { clearCart } = usePosStore()

  return useMutation({
    mutationFn: async (payload: CheckoutPayload) => {
      // 1. Get user profile for store_id and staff info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, store_id, full_name')
        .eq('id', user.id)
        .single()

      if (profileError || !profile?.store_id) {
        throw new Error('Store not found')
      }

      // 2. Calculate profit
      const profit = payload.items.reduce((sum, item) => {
        const itemProfit = (item.unit_price - item.cost_price) * item.quantity
        return sum + itemProfit
      }, 0) - payload.discount

      // 3. Insert sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: profile.store_id,
          staff_id: profile.id,
          staff_name: profile.full_name,
          payment_method: payload.payment_method,
          subtotal: payload.subtotal,
          discount: payload.discount,
          total: payload.total,
          profit: profit,
          receipt_no: crypto.randomUUID().slice(-8).toUpperCase()
        })
        .select('id, receipt_no')
        .single()

      if (saleError) throw saleError

      // 4. Insert sale_items
      const saleItems = payload.items.map(item => ({
        sale_id: sale.id,
        store_id: profile.store_id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        cost_price: item.cost_price,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // 5. Deduct stock from products
      for (const item of payload.items) {
        const { error: stockError } = await supabase.rpc('decrement_product_stock', {
          p_product_id: item.product_id,
          p_qty: item.quantity
        })

        // Fallback if RPC doesn't exist
        if (stockError) {
          const { data: product } = await supabase
            .from('products')
            .select('quantity')
            .eq('id', item.product_id)
            .single()

          if (product) {
            await supabase
              .from('products')
              .update({ quantity: Math.max(0, product.quantity - item.quantity) })
              .eq('id', item.product_id)
          }
        }
      }

// 6. Log audit - AFTER sale succeeds, BEFORE return
await logAudit(
  'SALE',
  `Receipt #${sale.receipt_no}: ${payload.items.length} items, ₦${payload.total.toLocaleString()}`,
  'sale'
)

      return { sale_id: sale.id, receipt_no: sale.receipt_no }
    },
    onSuccess: () => {
      toast.success('Sale completed!')
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Checkout failed')
    }
  })
}