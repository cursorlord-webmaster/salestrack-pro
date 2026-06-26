'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Search, X } from 'lucide-react'
import { ReceiptDialog } from '@/app/(stores)/pos/components/ReceiptDialog'
import { CartItem } from '@/lib/pos/usePosStore'

type SaleRecord = {
  id: string
  receipt_no: string
  staff_name: string
  staff_id: string
  store_id: string
  payment_method: string
  subtotal: string
  discount: string
  total: string
  profit: string
  is_voided: boolean
  created_at: string
  item_count?: number
  product_qty?: number // For product search mode
  product_total?: number // For product search mode
}

type SaleItemRecord = {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  cost_price: string
  unit_price: string
  total_price: string
}

export default function SalesHistoryPage() {
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'normal' | 'product'>('normal')
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([])
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single()

      if (error) throw error
      return data
    }
  })

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', profile?.store_id, selectedDate, searchQuery, searchMode],
    queryFn: async () => {
      if (!profile?.store_id) return []

      const startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)

      // Product search mode: query sale_items first
      if (searchMode === 'product' && searchQuery) {
        // 1. Find sale_items matching product name + date
        const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select('sale_id, quantity, total_price')
        .eq('store_id', profile.store_id)
        .ilike('product_name', `%${searchQuery}%`)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

        if (itemsError) throw itemsError
        if (!itemsData || itemsData.length === 0) return []

        // 2. Aggregate by sale_id
        const saleMap: Record<string, { qty: number; total: number }> = {}
        itemsData.forEach(item => {
          if (!saleMap[item.sale_id]) saleMap[item.sale_id] = { qty: 0, total: 0 }
          saleMap[item.sale_id].qty += item.quantity
          saleMap[item.sale_id].total += Number(item.total_price)
        })

        const saleIds = Object.keys(saleMap)

        // 3. Fetch sales for those IDs
        const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(count)
        `)
        .eq('store_id', profile.store_id)
        .eq('is_voided', false)
        .in('id', saleIds)
        .order('created_at', { ascending: false })

        if (salesError) throw salesError

        return salesData.map((sale: any) => ({
         ...sale,
          item_count: sale.sale_items?.[0]?.count || 0,
          product_qty: saleMap[sale.id].qty,
          product_total: saleMap[sale.id].total
        })) as SaleRecord[]
      }

      // Normal mode: search receipt# or staff_name
      let query = supabase
      .from('sales')
      .select(`
          *,
          sale_items(count)
        `)
      .eq('store_id', profile.store_id)
      .eq('is_voided', false)
      .order('created_at', { ascending: false })

      if (searchQuery) {
        // Staff search respects date filter
        query = query
         .gte('created_at', startDate.toISOString())
         .lte('created_at', endDate.toISOString())
         .or(`receipt_no.ilike.%${searchQuery}%,staff_name.ilike.%${searchQuery}%`)
      } else {
        query = query
         .gte('created_at', startDate.toISOString())
         .lte('created_at', endDate.toISOString())
      }

      const { data, error } = await query
      if (error) throw error

      return data.map((sale: any) => ({
       ...sale,
        item_count: sale.sale_items?.[0]?.count || 0
      })) as SaleRecord[]
    },
    enabled:!!profile?.store_id
  })

  const handleSearch = () => {
    // Auto-detect if searching for product vs receipt/staff
    if (searchQuery.trim()) {
      setSearchMode('product')
    } else {
      setSearchMode('normal')
    }
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchMode('normal')
  }

  const handleViewReceipt = async (sale: SaleRecord) => {
    setLoadingReceipt(true)

    const { data: items, error } = await supabase
    .from('sale_items')
    .select('*')
    .eq('sale_id', sale.id)
    .eq('store_id', sale.store_id)

    if (error) {
      console.error('Failed to fetch sale items:', error)
      setLoadingReceipt(false)
      return
    }

    const mappedItems: CartItem[] = (items as SaleItemRecord[]).map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      sku: '',
      price: Number(item.unit_price),
      costPrice: Number(item.cost_price),
      qty: item.quantity,
      stock: 0,
    }))

    setReceiptItems(mappedItems)
    setSelectedSale(sale)
    setReceiptOpen(true)
    setLoadingReceipt(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:justify-center md:items-center gap-3 pb-2">
        {/* Mobile: Search bar on top */}
        <div className="relative w-full md:w-56">
          <Input
            type="text"
            placeholder="Receipt#, Staff, or Product"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!e.target.value) setSearchMode('normal')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full text-black bg-white border-gray-300 pr-8"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile: Search button below search bar. Desktop: inline */}
        <Button onClick={handleSearch} size="sm" className="w-full md:w-auto">
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>

        {/* Desktop only: vertical divider */}
        <div className="hidden md:block h-6 w-px bg-gray-300 mx-1" />

        {/* Mobile: Date + Datepicker row. Desktop: inline */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
          <span className="text-lg font-semibold text-black">Date</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSearchQuery('')
              setSearchMode('normal')
            }}
            className="w-40 text-black bg-white border-gray-300"
          />
        </div>
      </div>

      {searchMode === 'product' && searchQuery && (
        <div className="text-center text-sm text-blue-600 font-medium">
          Showing sales containing "{searchQuery}"
        </div>
      )}

      <div className="rounded-md border bg-white overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="text-black font-semibold whitespace-nowrap w-16 text-center">#</TableHead>
                <TableHead className="text-black font-semibold whitespace-nowrap">Receipt#</TableHead>
                <TableHead className="text-black font-semibold whitespace-nowrap">Time</TableHead>
                <TableHead className="text-center text-black font-semibold whitespace-nowrap">Staff</TableHead>
                <TableHead className="text-center text-black font-semibold whitespace-nowrap">
                  {searchMode === 'product'? 'Qnty' : 'Items'}
                </TableHead>
                <TableHead className="text-black font-semibold whitespace-nowrap">Payment</TableHead>
                <TableHead className="text-center text-black font-semibold whitespace-nowrap">Total</TableHead>
                <TableHead className="text-right text-black font-semibold whitespace-nowrap">View Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-black">Loading sales...</TableCell>
                </TableRow>
              ) : sales?.length === 0? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-black">
                    {searchQuery? `No results for "${searchQuery}"` : `No sales found for ${selectedDate}`}
                  </TableCell>
                </TableRow>
              ) : (
                sales?.map((sale, idx) => (
                  <TableRow key={sale.id} className={sale.is_voided? 'opacity-50' : ''}>
                    <TableCell className="text-center text-slate-600 font-medium whitespace-nowrap">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-black whitespace-nowrap">{sale.receipt_no}</TableCell>
                    <TableCell className="text-black whitespace-nowrap">{format(new Date(sale.created_at), 'h:mm a')}</TableCell>
                    <TableCell className="text-center text-black whitespace-nowrap">{sale.staff_name || 'Unknown'}</TableCell>
                    <TableCell className="text-center text-black whitespace-nowrap">
                      {searchMode === 'product'? sale.product_qty : sale.item_count}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="capitalize">{sale.payment_method}</Badge>
                      {sale.is_voided && <Badge variant="destructive" className="ml-2">Voided</Badge>}
                    </TableCell>
                    <TableCell className="text-center font-medium text-black whitespace-nowrap">
                      ₦{Number(searchMode === 'product'? sale.product_total : sale.total).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewReceipt(sale)}
                        disabled={loadingReceipt}
                        className="text-slate-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {loadingReceipt? 'Loading...' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedSale && (
        <ReceiptDialog
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          items={receiptItems}
          discount={Number(selectedSale.discount)}
          total={Number(selectedSale.total)}
          paymentType={selectedSale.payment_method}
          saleId={selectedSale.receipt_no}
          saleDate={new Date(selectedSale.created_at)}
        />
      )}
    </div>
  )
}