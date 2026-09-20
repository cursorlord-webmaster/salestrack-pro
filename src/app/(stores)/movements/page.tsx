'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { CornerRightDown, CornerUpRight, ShieldX } from 'lucide-react'

type MovementRecord = {
  id: string
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'damage' | 'theft' | 'correction' | 'expired'
  quantity: number
  quantity_before: number | null
  quantity_after: number | null
  reason: string | null
  created_at: string
  products: { name: string; quantity: number } | null
  profiles: { full_name: string } | null
}

type TabType = 'all' | 'today' | 'in' | 'out'

const DISPLAY_LABEL: Record<MovementRecord['movement_type'], string> = {
  purchase: 'IN',
  sale: 'OUT',
  adjustment: 'ADJUST',
  damage: 'DAMAGE',
  theft: 'THEFT',
  correction: 'DATA CORRECT',
  expired: 'EXPIRED',
}

const TYPE_STYLES: Record<MovementRecord['movement_type'], string> = {
  purchase: 'bg-emerald-50 text-emerald-900 border-emerald-300',
  sale: 'bg-red-50 text-red-900 border-red-300',
  adjustment: 'bg-blue-50 text-blue-900 border-blue-300',
  damage: 'bg-orange-50 text-orange-900 border-orange-300',
  theft: 'bg-red-100 text-red-900 border-red-400',
  correction: 'bg-yellow-50 text-yellow-900 border-yellow-300',
  expired: 'bg-slate-100 text-slate-900 border-slate-300',
}

function parseReason(reason: string | null) {
  if (!reason) return { note: '', responsible: '' }
  const parts = reason.split('|').map(s => s.trim())
  let note = parts[0] || ''
  note = note.replace(/^(THEFT|DAMAGE|EXPIRED|ADJUSTMENT|CORRECTION):\s*/i, '')
  const responsiblePart = parts.find(p => p.toLowerCase().startsWith('responsible:')) || ''
  const responsible = responsiblePart ? responsiblePart.split(':').slice(1).join(':').trim() : ''
  return { note, responsible }
}

function getSourceLabel(type: MovementRecord['movement_type']) {
  switch (type) {
    case 'sale':
      return 'Sold Out'
    case 'purchase':
      return 'Item Restock'
    case 'adjustment':
      return 'Stock Count'
    case 'damage':
      return 'Damaged'
    case 'theft':
      return 'Theft / Loss'
    case 'correction':
      return 'Data Correction'
    case 'expired':
      return 'Expired'
    default:
      return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

export default function InventoryMovementsPage() {
  const supabase = createClient()
  const [storeId, setStoreId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id, role')
        .eq('id', user.id)
        .single()
      setStoreId(profile?.store_id || null)
      setRole(profile?.role || null)
    })
  }, [supabase])

  const { data: movements, isLoading } = useQuery({
    queryKey: ['inventory_movements', storeId, selectedDate, activeTab],
    queryFn: async () => {
      if (!storeId) return [] as MovementRecord[]

      let query = supabase
        .from('inventory_movements')
        .select(`
          id,
          movement_type,
          quantity,
          quantity_before,
          quantity_after,
          reason,
          created_at,
          created_by,
          products ( name, quantity ),
          profiles:created_by ( full_name )
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      const dateToUse = activeTab === 'today' ? today : selectedDate
      if (dateToUse) {
        const start = new Date(dateToUse)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateToUse)
        end.setHours(23, 59, 59, 999)
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
      }

      if (activeTab === 'in') {
        query = query.eq('movement_type', 'purchase')
      }
      if (activeTab === 'out') {
        query = query.in('movement_type', ['sale', 'damage', 'theft', 'correction', 'expired', 'adjustment'])
      }

      const { data, error } = await query
      if (error) throw error
      return data as MovementRecord[]
    },
    enabled: !!storeId && role !== 'cashier',
  })

  const filteredMovements = useMemo(() => {
    if (!searchQuery) return movements || []
    const q = searchQuery.toLowerCase()
    return (movements || []).filter((m: any) => {
      const productName = m.products?.name?.toLowerCase() || ''
      const staffName = m.profiles?.full_name?.toLowerCase() || ''
      const rawType = m.movement_type?.toLowerCase() || ''
      const displayType = (DISPLAY_LABEL[m.movement_type] || '').toLowerCase()
      const sourceLabel = getSourceLabel(m.movement_type).toLowerCase()
      const reason = (m.reason || '').toLowerCase()
      return (
        productName.includes(q) ||
        staffName.includes(q) ||
        rawType.includes(q) ||
        displayType.includes(q) ||
        sourceLabel.includes(q) ||
        reason.includes(q)
      )
    })
  }, [movements, searchQuery])

  if (role === 'cashier') {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[5px] border border-slate-300">
          <ShieldX className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-black font-extrabold text-center text-lg">Unauthorized</p>
          <p className="text-base text-black font-bold text-center mt-1">
            Cashiers cannot view inventory movements.
          </p>
        </div>
      </div>
    )
  }

  const getQty = (m: MovementRecord) => {
    const isIn = m.movement_type === 'purchase'
    if (isIn) {
      return { label: `+${m.quantity}`, className: 'text-emerald-800 font-extrabold' }
    }
    return { label: `-${m.quantity}`, className: 'text-red-800 font-extrabold' }
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 bg-slate-50 min-h-screen">
      {/* Filters Header - Centered Titles */}
      <div className="flex gap-4 flex-wrap justify-center items-end">
        <div className="flex-1 min-w-[260px] max-w-md">
          <label className="text-sm text-black font-extrabold mb-1.5 block text-center">
            Search Movements
          </label>
          <Input
            type="text"
            placeholder="Search by product, staff, type, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-black bg-white border-slate-400 font-bold text-center placeholder:text-slate-500 rounded-[5px] text-sm h-10"
          />
        </div>
        <div className="w-full sm:w-auto flex flex-col items-center">
          <label className="text-sm text-black font-extrabold mb-1.5 block text-center">
            Filter by Date
          </label>
          <Input
            type="date"
            value={activeTab === 'today' ? today : selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              if (activeTab === 'today') setActiveTab('all')
            }}
            className="w-44 text-black bg-white border-slate-400 font-bold text-center rounded-[5px] text-sm h-10"
          />
        </div>
      </div>

      {/* Tabs with 5px Border Radius */}
      <div className="flex justify-center gap-2.5 flex-wrap">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          size="default"
          onClick={() => setActiveTab('all')}
          className={
            activeTab === 'all'
              ? 'bg-slate-900 text-white rounded-[5px] font-extrabold hover:bg-slate-800 text-sm'
              : 'bg-white text-black border-slate-400 rounded-[5px] font-bold hover:bg-slate-100 text-sm'
          }
        >
          All
        </Button>
        <Button
          variant={activeTab === 'today' ? 'default' : 'outline'}
          size="default"
          onClick={() => {
            setActiveTab('today')
            setSelectedDate(today)
          }}
          className={
            activeTab === 'today'
              ? 'bg-slate-900 text-white rounded-[5px] font-extrabold hover:bg-slate-800 text-sm'
              : 'bg-white text-black border-slate-400 rounded-[5px] font-bold hover:bg-slate-100 text-sm'
          }
        >
          Today
        </Button>
        <Button
          variant={activeTab === 'in' ? 'default' : 'outline'}
          size="default"
          onClick={() => setActiveTab('in')}
          className={
            activeTab === 'in'
              ? 'bg-emerald-700 text-white rounded-[5px] font-extrabold hover:bg-emerald-800 text-sm'
              : 'bg-white text-black border-slate-400 rounded-[5px] font-bold hover:bg-slate-100 text-sm'
          }
        >
          <CornerRightDown className="h-4 w-4 mr-1.5" />
          Stock IN
        </Button>
        <Button
          variant={activeTab === 'out' ? 'default' : 'outline'}
          size="default"
          onClick={() => setActiveTab('out')}
          className={
            activeTab === 'out'
              ? 'bg-red-700 text-white rounded-[5px] font-extrabold hover:bg-red-800 text-sm'
              : 'bg-white text-black border-slate-400 rounded-[5px] font-bold hover:bg-slate-100 text-sm'
          }
        >
          <CornerUpRight className="h-4 w-4 mr-1.5" />
          Stock OUT
        </Button>
      </div>

      {/* Desktop Table View */}
      <div className="rounded-[5px] border border-slate-300 bg-white overflow-x-auto hidden md:block shadow-sm">
        <div className="max-h-[70vh] overflow-y-auto">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10 bg-white shadow-sm">
              <TableRow className="border-slate-300">
                <TableHead rowSpan={2} className="text-black font-extrabold text-sm text-center border-r border-slate-300 align-middle bg-white w-[180px]">
                  Timestamp
                </TableHead>
                <TableHead rowSpan={2} className="text-black font-extrabold text-sm text-center border-r border-slate-300 align-middle bg-white min-w-[160px]">
                  Product
                </TableHead>
                <TableHead rowSpan={2} className="text-black font-extrabold text-sm text-center border-r border-slate-300 align-middle bg-white min-w-[220px]">
                  Movement Type
                </TableHead>
                <TableHead rowSpan={2} className="text-black font-extrabold text-sm text-center border-r border-slate-300 align-middle bg-white w-[100px]">
                  Qty
                </TableHead>
                <TableHead rowSpan={2} className="text-black font-extrabold text-sm text-center border-r border-slate-300 align-middle bg-white w-[140px]">
                  Logged By
                </TableHead>
                <TableHead colSpan={2} className="text-black font-extrabold text-base text-center border-r border-slate-300 bg-slate-100 py-2">
                  Stock Status
                </TableHead>
              </TableRow>
              <TableRow className="border-slate-300 bg-slate-100">
                <TableHead className="text-black font-extrabold text-sm text-center border-r border-slate-300 w-[100px] py-2">
                  Before
                </TableHead>
                <TableHead className="text-black font-extrabold text-sm text-center border-r border-slate-300 w-[100px] py-2">
                  After
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-black font-bold py-10 text-base">
                    Loading movements...
                  </TableCell>
                </TableRow>
              ) : filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-black font-bold py-10 text-base">
                    No movements found for {activeTab === 'today' ? today : selectedDate}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((m) => {
                  const qty = getQty(m)
                  const parsed = parseReason(m.reason)
                  const isIn = m.movement_type === 'purchase'

                  let before = m.quantity_before
                  let after = m.quantity_after

                  if (before === null && m.reason) {
                    const bm = m.reason.match(/Before:\s*(\d+)/i)
                    if (bm) before = parseInt(bm[1])
                  }
                  if (after === null && m.reason) {
                    const am = m.reason.match(/After:\s*(\d+)/i)
                    if (am) after = parseInt(am[1])
                  }

                  if (before === null && after !== null) {
                    before = isIn ? after - m.quantity : after + m.quantity
                  }
                  if (after === null && before !== null) {
                    after = isIn ? before + m.quantity : before - m.quantity
                  }
                  if (before === null && m.products?.quantity !== undefined) {
                    const curr = m.products.quantity
                    before = isIn ? curr - m.quantity : curr + m.quantity
                    if (after === null) after = curr
                  }

                  const detailText = `${parsed.note}${parsed.note && parsed.responsible ? ' | ' : ''}${parsed.responsible ? `Staff Responsible: ${parsed.responsible}` : ''}`.trim()

                  return (
                    <TableRow key={m.id} className="border-slate-200 hover:bg-slate-50 transition-colors">
                      <TableCell className="text-black font-bold text-center text-sm border-r border-slate-200 whitespace-nowrap">
                        {format(new Date(m.created_at), 'yyyy-MM-dd hh:mm a')}
                      </TableCell>
                      <TableCell className="text-black font-extrabold text-center text-sm border-r border-slate-200" title={m.products?.name || ''}>
                        {m.products?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center border-r border-slate-200 p-2.5">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`inline-flex items-center px-3 py-1 text-xs font-extrabold border rounded-[5px] ${TYPE_STYLES[m.movement_type]}`}>
                            {DISPLAY_LABEL[m.movement_type]}
                          </span>
                          <span className="text-xs text-black font-bold">
                            {getSourceLabel(m.movement_type)}
                          </span>
                          {detailText && (
                            <span
                              title={detailText}
                              className="inline-block bg-black text-white px-2.5 py-1 text-xs font-medium rounded-[5px] max-w-[280px] text-center leading-tight break-words"
                            >
                              {detailText}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-center border-r border-slate-200 text-sm font-extrabold ${qty.className}`}>
                        {qty.label}
                      </TableCell>
                      <TableCell className="text-black font-bold text-center text-sm border-r border-slate-200 whitespace-nowrap">
                        {m.profiles?.full_name || 'System'}
                      </TableCell>
                      <TableCell className="text-center border-r border-slate-200 text-sm font-extrabold text-black bg-slate-50/50">
                        {before !== null ? before : '-'}
                      </TableCell>
                      <TableCell className="text-center border-r border-slate-200 text-sm font-extrabold text-black bg-slate-50/50">
                        {after !== null ? after : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Fully Centered Mobile Cards View */}
      <div className="md:hidden space-y-3.5">
        {isLoading ? (
          <div className="bg-white border border-slate-300 rounded-[5px] py-10 text-center text-black font-bold text-base">
            Loading movements...
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="bg-white border border-slate-300 rounded-[5px] py-10 text-center text-black font-bold text-base">
            No movements recorded
          </div>
        ) : (
          filteredMovements.map((m) => {
            const parsed = parseReason(m.reason)
            const isIn = m.movement_type === 'purchase'
            let before = m.quantity_before
            let after = m.quantity_after

            if (before === null && m.reason) {
              const bm = m.reason.match(/Before:\s*(\d+)/i)
              if (bm) before = parseInt(bm[1])
            }
            if (after === null && m.reason) {
              const am = m.reason.match(/After:\s*(\d+)/i)
              if (am) after = parseInt(am[1])
            }

            if (before === null && after !== null) before = isIn ? after - m.quantity : after + m.quantity
            if (after === null && before !== null) after = isIn ? before + m.quantity : before - m.quantity
            if (before === null && m.products?.quantity !== undefined) {
              before = isIn ? m.products.quantity - m.quantity : m.products.quantity + m.quantity
              after = m.products.quantity
            }

            const detailText = `${parsed.note}${parsed.note && parsed.responsible ? ' | ' : ''}${parsed.responsible ? `Staff Responsible: ${parsed.responsible}` : ''}`.trim()

            return (
              <div key={m.id} className="bg-white border border-slate-300 rounded-[5px] p-4 space-y-3 shadow-sm text-center flex flex-col items-center">
                {/* Movement Badge & Quantity */}
                <div className="flex flex-col items-center justify-center gap-1.5 border-b border-slate-200 pb-2.5 w-full">
                  <span className={`inline-flex items-center px-3 py-1 text-xs font-extrabold border rounded-[5px] ${TYPE_STYLES[m.movement_type]}`}>
                    {DISPLAY_LABEL[m.movement_type]} • {getSourceLabel(m.movement_type)}
                  </span>
                  <span className={`text-lg font-extrabold ${isIn ? 'text-emerald-800' : 'text-red-800'}`}>
                    {isIn ? `+${m.quantity}` : `-${m.quantity}`}
                  </span>
                </div>

                {/* Product Name */}
                <p className="text-black font-extrabold text-base text-center w-full">
                  {m.products?.name || 'Unknown Product'}
                </p>

                {/* Status Before -> After Bar */}
                <div className="flex justify-center items-center gap-3 bg-slate-100 py-2 px-4 rounded-[5px] text-sm text-black font-bold w-full max-w-xs mx-auto">
                  <span>Before: <strong className="font-extrabold text-slate-900">{before ?? '-'}</strong></span>
                  <span>→</span>
                  <span>After: <strong className="font-extrabold text-slate-900">{after ?? '-'}</strong></span>
                </div>

                {/* Logged By & Timestamp */}
                <div className="flex flex-col items-center justify-center gap-0.5 text-sm text-slate-800 font-medium w-full">
                  <span>Logged By: <strong className="text-black font-bold">{m.profiles?.full_name || 'System'}</strong></span>
                  <span className="text-slate-900 font-bold text-xs mt-0.5">
                    {format(new Date(m.created_at), 'yyyy-MM-dd hh:mm a')}
                  </span>
                </div>

                {/* Flexible Black Centered Note Tag */}
                {detailText && (
                  <div className="w-full flex justify-center pt-1">
                    <span className="inline-block bg-black text-white px-3 py-1.5 text-xs font-medium rounded-[5px] text-center leading-tight break-words max-w-full">
                      {detailText}
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}