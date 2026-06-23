import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  productId: string
  name: string
  sku: string
  price: number
  costPrice: number
  qty: number
  stock: number
}

type PosState = {
  cart: CartItem[]
  discount: number
  paymentType: 'cash' | 'pos' | 'transfer'
  addToCart: (item: Omit<CartItem, 'qty'>) => void
  removeFromCart: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  setDiscount: (discount: number) => void
  setPaymentType: (type: 'cash' | 'pos' | 'transfer') => void
  clearCart: () => void
  subtotal: () => number
  total: () => number
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      cart: [],
      discount: 0,
      paymentType: 'cash',
      
      addToCart: (item) => {
        const cart = get().cart
        const existing = cart.find(i => i.productId === item.productId)
        
        if (existing) {
          set({
            cart: cart.map(i =>
              i.productId === item.productId
                ? { ...i, qty: Math.min(i.qty + 1, i.stock) }
                : i
            )
          })
        } else {
          set({ cart: [...cart, { ...item, qty: 1 }] })
        }
      },

      removeFromCart: (productId) => {
        set({ cart: get().cart.filter(i => i.productId !== productId) })
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(productId)
          return
        }
        set({
          cart: get().cart.map(i =>
            i.productId === productId
              ? { ...i, qty: Math.min(qty, i.stock) }
              : i
          )
        })
      },

      setDiscount: (discount) => set({ discount }),
      setPaymentType: (paymentType) => set({ paymentType }),
      clearCart: () => set({ cart: [], discount: 0 }),
      
      subtotal: () => {
        return get().cart.reduce((sum, item) => sum + item.price * item.qty, 0)
      },
      
      total: () => {
        const sub = get().subtotal()
        const disc = get().discount
        return Math.max(0, sub - disc)
      }
    }),
    {
      name: 'pos-cart-storage'
    }
  )
)