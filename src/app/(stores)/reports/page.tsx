'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { BarChart } from "@/components/charts/bar-chart"
import { Bar } from "@/components/charts/bar"
import { BarXAxis } from "@/components/charts/bar-x-axis"
import { Grid } from "@/components/charts/grid"
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip"
import { Download, FileSpreadsheet, TrendingUp, Users, Package } from 'lucide-react'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subDays } from 'date-fns'

type Period = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom'
type AnalyticsView = 'revenue' | 'payment' | 'customers' | 'products' | 'mostProfitable' | 'slowestMoving' | 'categoryLeader' | 'nonSelling'

type ReportStats = {
  paymentBreakdown: {
    cash: number
    pos: number
    transfer: number
  }
  totalRevenue: number
  totalProfit: number
  totalOrders: number
  avgOrderValue: number
}

type TopProduct = {
  name: string
  quantity: number
  revenue: number
  profit: number
}

export default function ReportsPage() {
  const supabase = createClient()
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>('revenue')
  const [period, setPeriod] = useState<Period>('weekly')
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isExporting, setIsExporting] = useState(false)

  function getDateRange(): [Date, Date] {
    if (period === 'custom') {
      return [startOfDay(new Date(startDate)), endOfDay(new Date(endDate))]
    }
    const now = new Date()
    switch(period) {
      case 'today': return [startOfDay(now), endOfDay(now)]
      case 'weekly': return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })]
      case 'monthly': return [startOfMonth(now), endOfMonth(now)]
      case 'yearly': return [startOfYear(now), endOfYear(now)]
    }
  }

  function getGroupFormat() {
    switch(period) {
      case 'today': return 'ha'
      case 'weekly': return 'EEE'
      case 'monthly': return 'MMM d'
      case 'yearly': return 'MMM'
      case 'custom': return 'MMM d'
    }
  }

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
      return data
    }
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['report-stats', profile?.store_id, period, startDate, endDate],
    queryFn: async (): Promise<ReportStats> => {
      if (!profile?.store_id) throw new Error('No store')

      const [start, end] = getDateRange()

      const { data: salesData, error } = await supabase
  .from('sales')
  .select('total, profit, payment_method')
  .eq('store_id', profile.store_id)
  .eq('is_voided', false)
  .gte('created_at', start.toISOString())
  .lte('created_at', end.toISOString())

      if (error) throw error

      const paymentBreakdown = {
        cash: salesData?.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0) || 0,
        pos: salesData?.filter(s => s.payment_method === 'pos').reduce((sum, s) => sum + Number(s.total), 0) || 0,
        transfer: salesData?.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + Number(s.total), 0) || 0,
      }

      const totalRevenue = salesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0
      const totalProfit = salesData?.reduce((sum, s) => sum + Number(s.profit || 0), 0) || 0
      const totalOrders = salesData?.length || 0
      const avgOrderValue = totalOrders > 0? totalRevenue / totalOrders : 0

      return { paymentBreakdown, totalRevenue, totalProfit, totalOrders, avgOrderValue }
    },
    enabled:!!profile?.store_id
  })

  const { data: trendData } = useQuery({
    queryKey: ['report-trend', profile?.store_id, period, startDate, endDate],
    queryFn: async () => {
      if (!profile?.store_id) return []

      const [start, end] = getDateRange()

      const { data: salesData } = await supabase
 .from('sales')
 .select('created_at, total, profit')
 .eq('store_id', profile.store_id)
 .eq('is_voided', false)
 .gte('created_at', start.toISOString())
 .lte('created_at', end.toISOString())
 .order('created_at', { ascending: true })

      if (!salesData) return []

      const grouped: Record<string, { revenue: number, profit: number }> = {}
      const groupFormat = getGroupFormat()

      salesData.forEach(sale => {
        const groupKey = format(new Date(sale.created_at), groupFormat)
        if (!grouped[groupKey]) grouped[groupKey] = { revenue: 0, profit: 0 }
        grouped[groupKey].revenue += Number(sale.total)
        grouped[groupKey].profit += Number(sale.profit || 0)
      })

      return Object.entries(grouped).map(([period, data]) => ({
        period,
        revenue: data.revenue,
        profit: data.profit
      }))
    },
    enabled:!!profile?.store_id
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', profile?.store_id, period, startDate, endDate],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!profile?.store_id || analyticsView!== 'products') return []

      const [start, end] = getDateRange()

      const { data, error } = await supabase
  .from('sale_items')
  .select(`
      quantity,
      total_price,
      cost_price,
      unit_price,
      product_name,
      sales!inner(store_id, created_at, is_voided)
    `)
  .eq('sales.store_id', profile.store_id)
  .eq('sales.is_voided', false)
  .gte('sales.created_at', start.toISOString())
  .lte('sales.created_at', end.toISOString())
  .limit(2000)

      if (error) {
        console.error('Top products error:', error)
        return []
      }

      const productMap: Record<string, { name: string, quantity: number, revenue: number, profit: number }> = {}

      data?.forEach((item: any) => {
        const name = item.product_name
        const itemProfit = (Number(item.unit_price) - Number(item.cost_price)) * Number(item.quantity)
        if (!productMap[name]) {
          productMap[name] = { name, quantity: 0, revenue: 0, profit: 0 }
        }
        productMap[name].quantity += Number(item.quantity)
        productMap[name].revenue += Number(item.total_price)
        productMap[name].profit += itemProfit
      })

      return Object.values(productMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 15)
    },
    enabled:!!profile?.store_id && analyticsView === 'products'
  })

// Most Profitable Product Today
  const { data: mostProfitable } = useQuery({
    queryKey: ['most-profitable', profile?.store_id],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!profile?.store_id || analyticsView!== 'mostProfitable') return []

      const [start, end] = [startOfDay(new Date()), endOfDay(new Date())]

      const { data, error } = await supabase
.from('sale_items')
.select(`quantity, total_price, cost_price, unit_price, product_name, sales!inner(store_id, created_at, is_voided)`)
.eq('sales.store_id', profile.store_id)
.eq('sales.is_voided', false)
.gte('sales.created_at', start.toISOString())
.lte('sales.created_at', end.toISOString())
.limit(2000)

      if (error) return []

      const productMap: Record<string, { name: string, quantity: number, revenue: number, profit: number }> = {}

      data?.forEach((item: any) => {
        const name = item.product_name
        const itemProfit = (Number(item.unit_price) - Number(item.cost_price)) * Number(item.quantity)
        if (!productMap[name]) {
          productMap[name] = { name, quantity: 0, revenue: 0, profit: 0 }
        }
        productMap[name].quantity += Number(item.quantity)
        productMap[name].revenue += Number(item.total_price)
        productMap[name].profit += itemProfit
      })

      return Object.values(productMap)
 .sort((a, b) => b.profit - a.profit)
 .slice(0, 1)
    },
    enabled:!!profile?.store_id && analyticsView === 'mostProfitable'
  })

  // Slowest Moving Product
  const { data: slowestMoving } = useQuery({
    queryKey: ['slowest-moving', profile?.store_id, period, startDate, endDate],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!profile?.store_id || analyticsView!== 'slowestMoving') return []

      const [start, end] = getDateRange()

      const { data, error } = await supabase
.from('sale_items')
.select(`quantity, total_price, cost_price, unit_price, product_name, sales!inner(store_id, created_at, is_voided)`)
.eq('sales.store_id', profile.store_id)
.eq('sales.is_voided', false)
.gte('sales.created_at', start.toISOString())
.lte('sales.created_at', end.toISOString())
.limit(2000)

      if (error) return []

      const productMap: Record<string, { name: string, quantity: number, revenue: number, profit: number }> = {}

      data?.forEach((item: any) => {
        const name = item.product_name
        const itemProfit = (Number(item.unit_price) - Number(item.cost_price)) * Number(item.quantity)
        if (!productMap[name]) {
          productMap[name] = { name, quantity: 0, revenue: 0, profit: 0 }
        }
        productMap[name].quantity += Number(item.quantity)
        productMap[name].revenue += Number(item.total_price)
        productMap[name].profit += itemProfit
      })

      return Object.values(productMap)
 .filter(p => p.quantity > 0)
 .sort((a, b) => a.quantity - b.quantity)
 .slice(0, 5)
    },

  enabled:!!profile?.store_id && analyticsView === 'slowestMoving'
  })

  // Category Leader
  const { data: categoryLeader } = useQuery({
    queryKey: ['category-leader', profile?.store_id, period, startDate, endDate],
    queryFn: async () => {
      if (!profile?.store_id || analyticsView!== 'categoryLeader') return []

      const [start, end] = getDateRange()

      const { data, error } = await supabase
.from('sale_items')
.select(`
  total_price,
  cost_price,
  unit_price,
  quantity,
  products!inner(category_id, categories!inner(name)),
  sales!inner(store_id, created_at, is_voided)
`)
.eq('sales.store_id', profile.store_id)
.eq('sales.is_voided', false)
.gte('sales.created_at', start.toISOString())
.lte('sales.created_at', end.toISOString())
.limit(2000)

      if (error) return []

      const categoryMap: Record<string, { name: string, revenue: number, profit: number, quantity: number }> = {}

      data?.forEach((item: any) => {
        const categoryName = item.products.categories.name
        const itemProfit = (Number(item.unit_price) - Number(item.cost_price)) * Number(item.quantity)
        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = { name: categoryName, revenue: 0, profit: 0, quantity: 0 }
        }
        categoryMap[categoryName].revenue += Number(item.total_price)
        categoryMap[categoryName].profit += itemProfit
        categoryMap[categoryName].quantity += Number(item.quantity)
      })

      return Object.values(categoryMap)
.sort((a, b) => b.profit - a.profit)
    },
    enabled:!!profile?.store_id && analyticsView === 'categoryLeader'
  })

  // Non-Selling Products
  const { data: nonSelling } = useQuery({
    queryKey: ['non-selling', profile?.store_id, period, startDate, endDate],
    queryFn: async () => {
      if (!profile?.store_id || analyticsView!== 'nonSelling') return []

      const [start, end] = getDateRange()

      const { data: allProducts, error: productsError } = await supabase
.from('products')
.select('id, name, quantity, cost_price, selling_price')
.eq('store_id', profile.store_id)
.eq('is_active', true)

      if (productsError) return []

      const { data: soldItems, error: salesError } = await supabase
.from('sale_items')
.select(`product_id, sales!inner(store_id, created_at, is_voided)`)
.eq('sales.store_id', profile.store_id)
.eq('sales.is_voided', false)
.gte('sales.created_at', start.toISOString())
.lte('sales.created_at', end.toISOString())

      if (salesError) return []

      const soldProductIds = new Set(soldItems?.map((item: any) => item.product_id))

      return allProducts
.filter(p =>!soldProductIds.has(p.id))
.map(p => ({
  name: p.name,
  quantity: p.quantity,
  revenue: 0,
  profit: 0,
  costPrice: Number(p.cost_price),
  sellingPrice: Number(p.selling_price)
}))
.sort((a, b) => b.quantity - a.quantity)
    },
    enabled:!!profile?.store_id && analyticsView === 'nonSelling'
  })

 
  function formatNaira(amount: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  function getPeriodLabel() {
    if (period === 'today') return 'Today'
    if (period === 'custom') return `${format(getDateRange()[0], 'MMM d')} - ${format(getDateRange()[1], 'MMM d, yyyy')}`
    if (period === 'weekly') return 'This Week'
    if (period === 'monthly') return format(getDateRange()[0], 'MMMM yyyy')
    if (period === 'yearly') return format(getDateRange()[0], 'yyyy')
    return ''
  }

  async function fetchSalesForExport() {
    if (!profile?.store_id) return []

    const [start, end] = getDateRange()

    const { data } = await supabase
.from('sales')
.select('receipt_no, created_at, staff_name, payment_method, total, profit')
.eq('store_id', profile.store_id)
.eq('is_voided', false)
.gte('created_at', start.toISOString())
.lte('created_at', end.toISOString())
.order('created_at', { ascending: false })
.limit(1000)

    return data || []
  }

  async function exportToPDF() {
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const salesList = await fetchSalesForExport()
      const doc = new jsPDF()
      const [start] = getDateRange()

      doc.setFontSize(18)
      doc.text('SalesTrack Pro - Analytics Report', 105, 15, { align: 'center' })
      doc.setFontSize(11)
      doc.text(`View: ${analyticsView.toUpperCase()} | Period: ${getPeriodLabel()}`, 105, 22, { align: 'center' })

      const tableData = salesList.map(sale => [
        sale.receipt_no,
        format(new Date(sale.created_at), 'MMM d, h:mm a'),
        sale.staff_name || 'System',
        sale.payment_method.toUpperCase(),
        formatNaira(Number(sale.total)),
        formatNaira(Number(sale.profit || 0))
      ])

      autoTable(doc, {
        startY: 30,
        head: [['Receipt', 'Date/Time', 'Staff', 'Method', 'Total', 'Profit']],
        body: tableData,
        styles: { halign: 'center' },
        headStyles: { fillColor: [51, 65, 85] }
      })

      doc.save(`analytics-${analyticsView}-${format(start, 'yyyy-MM-dd')}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  async function exportToExcel() {
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      const salesList = await fetchSalesForExport()
      const [start] = getDateRange()

      const ws = XLSX.utils.json_to_sheet(
        salesList.map(sale => ({
          'Receipt No': sale.receipt_no,
          'Date/Time': format(new Date(sale.created_at), 'MMM d, yyyy h:mm a'),
          'Staff': sale.staff_name || 'System',
          'Payment Method': sale.payment_method.toUpperCase(),
          'Total (₦)': Number(sale.total),
          'Profit (₦)': Number(sale.profit || 0)
        }))
      )
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Analytics')
      XLSX.writeFile(wb, `analytics-${analyticsView}-${format(start, 'yyyy-MM-dd')}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  if (statsLoading) {
    return <div className="flex items-center justify-center h-96"><div className="text-slate-600">Loading analytics...</div></div>
  }

  return (
    <div className="space-y-4">
      {/* Sales Trend Chart - HERO */}
      <Card className="bg-white border-slate-200 rounded">
        <CardHeader className="border-b border-slate-200 pb-3">
          <CardTitle className="text-lg font-semibold text-slate-900 text-center">
            Sales Trend - {getPeriodLabel()}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {trendData && trendData.length > 0? (
            <BarChart
              data={trendData}
              xDataKey="period"
              animationDuration={1100}
              barGap={0.2}
            >
              <Grid horizontal />
              <Bar dataKey="revenue" lineCap="round" fill="var(--chart-1)" fadedOpacity={0.3} />
              <Bar dataKey="profit" lineCap="round" fill="var(--chart-2)" fadedOpacity={0.3} />
              <BarXAxis />
              <ChartTooltip showCrosshair={false} />
            </BarChart>
          ) : (
            <div className="text-center text-slate-500 py-12">No sales data for selected period</div>
          )}
        </CardContent>
      </Card>

      {/* Controls + Dynamic Summary */}
      <Card className="bg-white border-slate-200 rounded">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-4">
{/* Selectors */}
<div className="flex flex-wrap gap-3 items-end justify-center">
  <div className="space-y-1.5 flex flex-col items-center">
    <Label className="text-center text-xs font-medium text-slate-600">Analytics</Label>
    <Select value={analyticsView} onValueChange={(v) => setAnalyticsView(v as AnalyticsView)}>
      <SelectTrigger className="w-44 h-9 text-center">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="revenue">Revenue & Profit</SelectItem>
        <SelectItem value="payment">Payment Methods</SelectItem>
        <SelectItem value="customers">Total Customers</SelectItem>
        <SelectItem value="products">Most Sold Products</SelectItem>
        <SelectItem value="mostProfitable">Most Profitable Today</SelectItem>
        <SelectItem value="slowestMoving">Slowest Moving</SelectItem>
        <SelectItem value="categoryLeader">Category Leader</SelectItem>
        <SelectItem value="nonSelling">Non-Selling Products</SelectItem>
      </SelectContent>
    </Select>
  </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <Label className="text-center text-xs font-medium text-slate-600">Period</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                  <SelectTrigger className="w-36 h-9 text-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="weekly">This Week</SelectItem>
                    <SelectItem value="monthly">This Month</SelectItem>
                    <SelectItem value="yearly">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === 'custom' && (
                <>
                  <div className="space-y-1.5 flex flex-col items-center">
                    <Label className="text-center text-xs font-medium text-slate-600">Start</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-36 h-9 text-center"
                    />
                  </div>
                  <div className="space-y-1.5 flex flex-col items-center">
                    <Label className="text-center text-xs font-medium text-slate-600">End</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-36 h-9 text-center"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 items-end">
                <Button onClick={exportToPDF} disabled={isExporting} variant="outline" size="sm" className="gap-1.5 h-9">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
                <Button onClick={exportToExcel} disabled={isExporting} variant="outline" size="sm" className="gap-1.5 h-9">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </Button>
              </div>
            </div>

            {/* Dynamic Summary Bar - ONE LINE ON MOBILE */}
            <div className="w-full bg-slate-50 py-3 px-4 rounded overflow-x-auto">
              <div className="text-center text-xs sm:text-sm text-slate-700 font-medium whitespace-nowrap">
                {analyticsView === 'revenue' && (
                  <>
                    <TrendingUp className="inline h-4 w-4 mr-1" />
                    Total Revenue: <span className="text-slate-900 font-bold">{formatNaira(stats?.totalRevenue || 0)}</span>
                    <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                    Profit: <span className="text-slate-900 font-bold">{formatNaira(stats?.totalProfit || 0)}</span>
                    <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                    Sales: <span className="text-slate-900 font-bold">{stats?.totalOrders || 0}</span>
                  </>
                )}
                {analyticsView === 'payment' && (
                  <>
                    Cash {getPeriodLabel()}: <span className="text-slate-900 font-bold">{formatNaira(stats?.paymentBreakdown.cash || 0)}</span>
                    <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                    POS {getPeriodLabel()}: <span className="text-slate-900 font-bold">{formatNaira(stats?.paymentBreakdown.pos || 0)}</span>
                    <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                    Transfer {getPeriodLabel()}: <span className="text-slate-900 font-bold">{formatNaira(stats?.paymentBreakdown.transfer || 0)}</span>
                  </>
                )}
                {analyticsView === 'customers' && (
                  <>
                    <Users className="inline h-4 w-4 mr-1" />
                    Total Customers: <span className="text-slate-900 font-bold">{stats?.totalOrders || 0}</span>
                    <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                    Avg Purchase Amount: <span className="text-slate-900 font-bold">{formatNaira(stats?.avgOrderValue || 0)}</span>
                  </>
                )}
                     {analyticsView === 'products' && (
                <>
                  <Package className="inline h-4 w-4 mr-1" />
                  Showing Most Sold Products For {getPeriodLabel()}
                </>
              )}
              {analyticsView === 'mostProfitable' && mostProfitable && mostProfitable.length > 0 && (
                <>
                  <TrendingUp className="inline h-4 w-4 mr-1 text-emerald-600" />
                  Today's Winner: <span className="text-slate-900 font-bold">{mostProfitable[0].name}</span>
                  <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                  Profit: <span className="text-emerald-600 font-bold">{formatNaira(mostProfitable[0].profit)}</span>
                </>
              )}
              {analyticsView === 'slowestMoving' && slowestMoving && slowestMoving.length > 0 && (
                <>
                  <Package className="inline h-4 w-4 mr-1 text-amber-600" />
                  Slowest: <span className="text-slate-900 font-bold">{slowestMoving[0].name}</span>
                  <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                  Qty: <span className="text-amber-600 font-bold">{slowestMoving[0].quantity}</span>
                </>
              )}
              {analyticsView === 'categoryLeader' && categoryLeader && categoryLeader.length > 0 && (
                <>
                  <TrendingUp className="inline h-4 w-4 mr-1 text-emerald-600" />
                  Category Leader: <span className="text-slate-900 font-bold">{categoryLeader[0].name}</span>
                  <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                  Profit: <span className="text-emerald-600 font-bold">{formatNaira(categoryLeader[0].profit)}</span>
                </>
              )}
              {analyticsView === 'nonSelling' && (
                <>
                  <Package className="inline h-4 w-4 mr-1 text-red-600" />
                  Non-Selling: <span className="text-slate-900 font-bold">{nonSelling?.length || 0}</span>
                  <span className="mx-2 sm:mx-3 text-slate-300">|</span>
                  Dead Stock: <span className="text-red-600 font-bold">{formatNaira(nonSelling?.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0) || 0)}</span>
                </>
              )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Content Area */}
      {analyticsView === 'payment' && (
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 text-center">
              Payment Methods Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <BarChart
              data={[
                { method: 'Cash', amount: stats?.paymentBreakdown.cash || 0 },
                { method: 'POS', amount: stats?.paymentBreakdown.pos || 0 },
                { method: 'Transfer', amount: stats?.paymentBreakdown.transfer || 0 }
              ]}
              xDataKey="method"
              animationDuration={1100}
              barGap={0.3}
            >
              <Grid horizontal />
              <Bar dataKey="amount" lineCap="round" fill="var(--chart-3)" fadedOpacity={0.3} />
              <BarXAxis />
              <ChartTooltip showCrosshair={false} />
            </BarChart>
          </CardContent>
        </Card>
      )}

      {analyticsView === 'products' && (
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 text-center">
              Most Sold Products - {getPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {topProducts && topProducts.length > 0? (
              <div className="overflow-x-auto">
                <Table>
  <TableHeader>
    <TableRow>
      <TableHead className="text-center w-16 px-4">Rank</TableHead>
      <TableHead className="px-6">Product</TableHead>
      <TableHead className="text-center px-4">Qty Sold</TableHead>
      <TableHead className="text-right px-4">Revenue</TableHead>
      <TableHead className="text-right px-4">Profit</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {topProducts.map((product, idx) => (
      <TableRow key={product.name}>
        <TableCell className="text-center font-medium w-16 px-4">{idx + 1}</TableCell>
        <TableCell className="font-medium px-6">{product.name}</TableCell>
        <TableCell className="text-center px-4">{product.quantity}</TableCell>
        <TableCell className="text-right font-semibold px-4">{formatNaira(product.revenue)}</TableCell>
        <TableCell className="text-right font-semibold text-emerald-600 px-4">{formatNaira(product.profit)}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">No product data for selected period</div>
            )}
          </CardContent>
        </Card>
      )}
	  
	        {analyticsView === 'mostProfitable' && (
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 text-center">
              Most Profitable Product Today
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {mostProfitable && mostProfitable.length > 0? (
              <div className="text-center space-y-4">
                <div className="text-4xl font-bold text-emerald-600">{mostProfitable[0].name}</div>
                <div className="flex justify-center gap-8 text-sm">
                  <div>
                    <div className="text-slate-500">Qty Sold</div>
                    <div className="text-2xl font-bold text-slate-900">{mostProfitable[0].quantity}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Revenue</div>
                    <div className="text-2xl font-bold text-slate-900">{formatNaira(mostProfitable[0].revenue)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Profit</div>
                    <div className="text-2xl font-bold text-emerald-600">{formatNaira(mostProfitable[0].profit)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">No sales today yet</div>
            )}
          </CardContent>
        </Card>
      )}

      {analyticsView === 'slowestMoving' && (
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 text-center">
              Slowest Moving Products - {getPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {slowestMoving && slowestMoving.length > 0? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-16 px-4">Rank</TableHead>
                      <TableHead className="px-6">Product</TableHead>
                      <TableHead className="text-center px-4">Qty Sold</TableHead>
                      <TableHead className="text-right px-4">Revenue</TableHead>
                      <TableHead className="text-right px-4">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slowestMoving.map((product, idx) => (
                      <TableRow key={product.name}>
                        <TableCell className="text-center font-medium w-16 px-4">{idx + 1}</TableCell>
                        <TableCell className="font-medium px-6">{product.name}</TableCell>
                        <TableCell className="text-center px-4 text-amber-600 font-semibold">{product.quantity}</TableCell>
                        <TableCell className="text-right font-semibold px-4">{formatNaira(product.revenue)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 px-4">{formatNaira(product.profit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">No sales data for selected period</div>
            )}
          </CardContent>
        </Card>
      )}

      {analyticsView === 'categoryLeader' && (
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 text-center">
              Category Performance - {getPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {categoryLeader && categoryLeader.length > 0? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-16 px-4">Rank</TableHead>
                      <TableHead className="px-6">Category</TableHead>
                      <TableHead className="text-center px-4">Units Sold</TableHead>
                      <TableHead className="text-right px-4">Revenue</TableHead>
                      <TableHead className="text-right px-4">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryLeader.map((cat, idx) => (
                      <TableRow key={cat.name}>
                        <TableCell className="text-center font-medium w-16 px-4">{idx + 1}</TableCell>
                        <TableCell className="font-medium px-6">{cat.name}</TableCell>
                        <TableCell className="text-center px-4">{cat.quantity}</TableCell>
                        <TableCell className="text-right font-semibold px-4">{formatNaira(cat.revenue)}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 px-4">{formatNaira(cat.profit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-slate-500 py-12">No category data for selected period</div>
            )}
          </CardContent>
        </Card>
      )}

      {analyticsView === 'nonSelling' && (
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 pb-3">
            <CardTitle className="text-lg font-semibold text-slate-900 text-center">
              Non-Selling Products - {getPeriodLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {nonSelling && nonSelling.length > 0? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Product</TableHead>
                      <TableHead className="text-center px-4">In Stock</TableHead>
                      <TableHead className="text-right px-4">Cost Price</TableHead>
                      <TableHead className="text-right px-4">Selling Price</TableHead>
                      <TableHead className="text-right px-4">Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonSelling.map((product) => (
                      <TableRow key={product.name}>
                        <TableCell className="font-medium px-6">{product.name}</TableCell>
                        <TableCell className="text-center px-4 text-red-600 font-semibold">{product.quantity}</TableCell>
                        <TableCell className="text-right px-4">{formatNaira(product.costPrice)}</TableCell>
                        <TableCell className="text-right px-4">{formatNaira(product.sellingPrice)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600 px-4">{formatNaira(product.quantity * product.costPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-emerald-600 font-medium py-12">All products sold this period 🎉</div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
