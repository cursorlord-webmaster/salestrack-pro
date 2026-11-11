// src/lib/offline/db.ts
// Offline storage using IndexedDB - survives refresh, survives WiFi off, 100MB+ limit
import { createStore, get, set, del } from 'idb-keyval'

const store = createStore('salestrack-offline-db', 'salestrack-store')

export type CachedProduct = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  quick_search_name: string | null
  selling_price: number
  cost_price: number
  quantity: number
  active: boolean
}

export type OfflineSale = {
  idempotency_key: string
  store_id: string
  staff_id: string
  staff_name: string
  payload: {
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
  }
  created_at: string // original sale time, not sync time
  synced: boolean
}

const productsKey = (storeId: string) => `products_cache_${storeId}`
const queueKey = (storeId: string) => `offline_queue_${storeId}`

// --- PRODUCTS CACHE ---
export async function saveProductsCache(storeId: string, products: CachedProduct[]) {
  await set(productsKey(storeId), { products, saved_at: new Date().toISOString() }, store)
}

export async function getProductsCache(storeId: string): Promise<{ products: CachedProduct[]; saved_at: string } | null> {
  const data = await get(productsKey(storeId), store)
  return data ?? null
}

// Decrement cache quantity locally after offline sale, so next sale sees correct stock
export async function decrementCacheQuantity(storeId: string, productId: string, qty: number) {
  const cached = await getProductsCache(storeId)
  if (!cached) return
  const updated = cached.products.map(p =>
    p.id === productId ? { ...p, quantity: Math.max(0, p.quantity - qty) } : p
  )
  await saveProductsCache(storeId, updated)
}

// --- OFFLINE SALES QUEUE ---
export async function addToOfflineQueue(storeId: string, sale: OfflineSale) {
  const existing = await getOfflineQueue(storeId)
  // Don't duplicate same key in queue
  if (existing.some(s => s.idempotency_key === sale.idempotency_key)) return
  existing.push(sale)
  await set(queueKey(storeId), existing, store)
}

export async function getOfflineQueue(storeId: string): Promise<OfflineSale[]> {
  const data = await get(queueKey(storeId), store)
  return (data as OfflineSale[]) ?? []
}

export async function removeFromOfflineQueue(storeId: string, idempotency_key: string) {
  const existing = await getOfflineQueue(storeId)
  const filtered = existing.filter(s => s.idempotency_key !== idempotency_key)
  await set(queueKey(storeId), filtered, store)
}

export async function clearOfflineQueue(storeId: string) {
  await del(queueKey(storeId), store)
}