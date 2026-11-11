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
  idempotency_key: string
  created_at?: string // original offline sale time, for sync only
  is_sync?: boolean // true when syncing queued offline sale — silent toast
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

      // 3. Idempotency check - if this key already exists, return existing sale, don't duplicate
      const { data: existingSale } = await supabase
        .from('sales')
        .select('id, receipt_no')
        .eq('idempotency_key', payload.idempotency_key)
        .maybeSingle()

      if (existingSale) {
        return { sale_id: existingSale.id, receipt_no: existingSale.receipt_no, already_completed: true as const, is_sync: !!payload.is_sync }
      }

      // 3b. Insert sale - receipt_no derived from key so retry = same receipt_no
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
          receipt_no: payload.idempotency_key.replace(/-/g, '').slice(0, 8).toUpperCase(),
          idempotency_key: payload.idempotency_key,
          created_at: payload.created_at ?? new Date().toISOString()
        })
        .select('id, receipt_no')
        .single()

      if (saleError) {
        // Race: two clicks at same millisecond, second hits UNIQUE - fetch existing
        if ((saleError as any).code === '23505') {
          const { data: dup } = await supabase
            .from('sales')
            .select('id, receipt_no')
            .eq('idempotency_key', payload.idempotency_key)
            .maybeSingle()
          if (dup) return { sale_id: dup.id, receipt_no: dup.receipt_no, already_completed: true as const, is_sync: !!payload.is_sync }
        }
        throw saleError
      }

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

      return { sale_id: sale.id, receipt_no: sale.receipt_no, is_sync: !!payload.is_sync }
    },
    onSuccess: (result: any) => {
      if (result?.is_sync) {
        // Silent for sync — pos/page.tsx will show one summary toast "X offline sales synced"
      } else if (result?.already_completed) {
        toast.success(`You have already completed this sale - Receipt #${result.receipt_no}`)
      } else {
        toast.success('Sale completed!')
      }
      clearCart()
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Checkout failed')
    }
  })
}