'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Eye, Search } from 'lucide-react'
import { ReceiptDialog } from '@/app/(stores)/pos/components/ReceiptDialog'
import { usePosStore, CartItem } from '@/lib/pos/usePosStore'

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
}

type SaleItemRecord = {
  id: string
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
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null)
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([])
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [loadingReceipt, setLoadingReceipt] = useState(false)

  // Get current profile for RLS - store_id comes from auth context
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
    queryKey: ['sales', profile?.store_id, selectedDate, searchQuery],
    queryFn: async () => {
      if (!profile?.store_id) return []
      
      let query = supabase
        .from('sales')
        .select(`
          *,
          sale_items(count)
        `)
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.ilike('receipt_no', `%${searchQuery}%`)
      } else {
        const startDate = new Date(selectedDate)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)

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
    enabled: !!profile?.store_id
  })

  const handleSearch = () => {
    // Triggers refetch via queryKey change
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

    // Map DB items to CartItem format for ReceiptDialog
    const mappedItems: CartItem[] = (items as SaleItemRecord[]).map((item) => ({
      productId: item.product_id,
      name: item.product_name,
      sku: '',
      price: Number(item.unit_price),
      costPrice: Number(item.cost_price),
      qty: item.quantity,
      stock: 0, // Not needed for receipt view
    }))

    setReceiptItems(mappedItems)
    setSelectedSale(sale)
    setReceiptOpen(true)
    setLoadingReceipt(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-center items-center gap-3 pb-2 flex-wrap">
        <Input
          type="text"
          placeholder="Search Receipt#"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-48 text-black bg-white border-gray-300"
        />
        <Button onClick={handleSearch} size="sm">
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>

        <div className="h-6 w-px bg-gray-300 mx-1" />

        <span className="text-lg font-semibold text-black">Date</span>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value)
            setSearchQuery('')
          }}
          className="w-40 text-black bg-white border-gray-300"
        />
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="text-black font-semibold whitespace-nowrap">Receipt#</TableHead>
                <TableHead className="text-black font-semibold whitespace-nowrap">Time</TableHead>
                <TableHead className="text-center text-black font-semibold whitespace-nowrap">Staff</TableHead>
                <TableHead className="text-center text-black font-semibold whitespace-nowrap">Items</TableHead>
                <TableHead className="text-black font-semibold whitespace-nowrap">Payment</TableHead>
                <TableHead className="text-center text-black font-semibold whitespace-nowrap">Total</TableHead>
                <TableHead className="text-right text-black font-semibold whitespace-nowrap">View Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-black">Loading sales...</TableCell>
                </TableRow>
              ) : sales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-black">
                    {searchQuery ? `No sale found for "${searchQuery}"` : `No sales found for ${selectedDate}`}
                  </TableCell>
                </TableRow>
              ) : (
                sales?.map((sale) => (
                  <TableRow key={sale.id} className={sale.is_voided ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-black whitespace-nowrap">{sale.receipt_no}</TableCell>
                    <TableCell className="text-black whitespace-nowrap">{format(new Date(sale.created_at), 'h:mm a')}</TableCell>
                    <TableCell className="text-center text-black whitespace-nowrap">{sale.staff_name || 'Unknown'}</TableCell>
                    <TableCell className="text-center text-black whitespace-nowrap">{sale.item_count}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="capitalize">{sale.payment_method}</Badge>
                      {sale.is_voided && <Badge variant="destructive" className="ml-2">Voided</Badge>}
                    </TableCell>
                    <TableCell className="text-center font-medium text-black whitespace-nowrap">
                      ₦{Number(sale.total).toLocaleString()}
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
                        {loadingReceipt ? 'Loading...' : 'View'}
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