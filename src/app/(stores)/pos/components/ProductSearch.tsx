'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePosStore } from '@/lib/pos/usePosStore'
import { toast } from 'sonner'

export function ProductSearch() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const { addToCart } = usePosStore()
  const supabase = createClient()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-search when 3+ letters typed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (search.trim().length < 3) {
      setResults([])
      setStatusMessage(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      handleSearch()
    }, 100) // 100ms - feels instant but still prevents spam

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const handleSearch = async () => {
    const trimmed = search.trim()
    if (!trimmed) return

    setLoading(true)
    setStatusMessage(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.error('No authenticated user found')
      toast.error('Please log in again')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
     .from('profiles')
     .select('store_id')
     .eq('id', user.id)
     .maybeSingle()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      toast.error('Profile query failed')
      setLoading(false)
      return
    }

    if (!profile?.store_id) {
      console.error('No store_id found for user:', user.id)
      toast.error('Account not linked to a store')
      setLoading(false)
      return
    }

    // 1. Try to find IN-STOCK products
    const { data, error } = await supabase
     .from('products')
     .select('id, name, sku, barcode, selling_price, cost_price, quantity')
     .eq('store_id', profile.store_id)
     .eq('active', true)
     .gt('quantity', 0)
     .or(`name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%,barcode.eq.${trimmed},quick_search_name.ilike.%${trimmed}%`)
     .limit(10)

    if (error) {
      console.error('Supabase error:', error.message, error.details, error.hint)
      toast.error('Search failed')
      setResults([])
      setLoading(false)
      return
    }

    if (data && data.length > 0) {
      setResults(data)
      setStatusMessage(null)
      setLoading(false)
      return
    }

    // 2. No in-stock results - check if product exists but is sold out
    const { data: existingData } = await supabase
     .from('products')
     .select('id, quantity')
     .eq('store_id', profile.store_id)
     .eq('active', true)
     .or(`name.ilike.%${trimmed}%,sku.ilike.%${trimmed}%,barcode.eq.${trimmed},quick_search_name.ilike.%${trimmed}%`)
     .limit(1)

    if (existingData && existingData.length > 0) {
      // Product was added before but quantity is 0
      setResults([])
      setStatusMessage("The searched product is currently out of stock")
    } else {
      // Product was never added
      setResults([])
      setStatusMessage("The searched product is not in your inventory")
    }

    setLoading(false)
  }

  const handleAddToCart = (product: any) => {
    if (product.quantity <= 0) {
      toast.error('Out of stock')
      return
    }

    addToCart({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.selling_price),
      costPrice: Number(product.cost_price),
      stock: product.quantity
    })

    toast.success(`Added ${product.name}`)
    setSearch('')
    setResults([])
    setStatusMessage(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Scan barcode or search name / SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {statusMessage && (
        <div className="border rounded-lg p-4 text-center bg-amber-50 border-amber-200">
          <p className="text-sm font-medium text-amber-800">{statusMessage}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm text-gray-500">
                  SKU: {product.sku} | Stock: {product.quantity} | ₦{Number(product.selling_price).toLocaleString()}
                </p>
              </div>
              <Button size="sm" onClick={() => handleAddToCart(product)}>
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}