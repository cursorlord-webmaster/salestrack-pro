"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ShelvingUnit,
  Users,
  User,
  HandCoins,
  Coins
} from "lucide-react"
import { format } from "date-fns"

type DashboardStats = {
  todaySales: number
  todayRevenue: number
  todayProfit: number
  lowStockCount: number
}

type RecentSale = {
  receipt_no: string
  created_at: string
  staff_name: string | null
  total: number
  profit: number
}

type FastMover = {
  product_name: string
  qty: number
  revenue: number
  profit: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [fastMovers, setFastMovers] = useState<FastMover[]>([])
  const [projectedProfit, setProjectedProfit] = useState(0)
  const [totalStockValue, setTotalStockValue] = useState(0)
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
   .from('profiles')
   .select('store_id')
   .eq('id', user.id)
   .single()

    if (!profile?.store_id) return
    const storeId = profile.store_id

    const { data: settings } = await supabase
   .from('store_settings')
   .select('low_stock_threshold')
   .eq('store_id', storeId)
   .single()

    const lowStockThreshold = settings?.low_stock_threshold || 10

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data: todaySalesData } = await supabase
   .from('sales')
   .select('total, profit')
   .eq('store_id', storeId)
   .eq('is_voided', false)
   .gte('created_at', today.toISOString())
   .lt('created_at', tomorrow.toISOString())

    const todayRevenue = todaySalesData?.reduce((sum, s) => sum + Number(s.total), 0) || 0
    const todayProfit = todaySalesData?.reduce((sum, s) => sum + Number(s.profit || 0), 0) || 0

    const { count: lowStockCount } = await supabase
   .from('products')
   .select('*', { count: 'exact', head: true })
   .eq('store_id', storeId)
   .lte('quantity', lowStockThreshold)

    setStats({
      todaySales: todaySalesData?.length || 0,
      todayRevenue: todayRevenue,
      todayProfit: todayProfit,
      lowStockCount: lowStockCount || 0
    })

    const { data: salesData } = await supabase
   .from('sales')
   .select('receipt_no, created_at, staff_name, total, profit')
   .eq('store_id', storeId)
   .eq('is_voided', false)
   .order('created_at', { ascending: false })
   .limit(10)
    setRecentSales(salesData || [])

    // Fast movers - last 30 days with profit calc
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: itemsData } = await supabase
  .from('sale_items')
  .select('product_name, product_id, quantity, total_price')
  .eq('store_id', storeId)
  .gte('created_at', thirtyDaysAgo.toISOString())

    if (itemsData && itemsData.length > 0) {
      // Get unique product IDs - filter out nulls
      const productIds = [...new Set(itemsData.map(i => i.product_id).filter(Boolean))]

      // Only query products if we have IDs
      let costMap: Record<string, number> = {}
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
      .from('products')
      .select('id, cost_price')
      .eq('store_id', storeId)
      .in('id', productIds)

        productsData?.forEach(p => {
          costMap[p.id] = Number(p.cost_price) || 0
        })
      }

      const productSales: Record<string, { qty: number; revenue: number; profit: number }> = {}
      itemsData.forEach(item => {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { qty: 0, revenue: 0, profit: 0 }
        }

        // Guard: if no product_id or cost_price, profit = 0
        const costPrice = item.product_id? (costMap[item.product_id] || 0) : 0
        const itemProfit = Number(item.total_price) - (costPrice * item.quantity)

        productSales[item.product_name].qty += item.quantity
        productSales[item.product_name].revenue += Number(item.total_price)
        productSales[item.product_name].profit += itemProfit
      })

      const sorted = Object.entries(productSales)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5)
    .map(([product_name, data]) => ({ product_name,...data }))
      setFastMovers(sorted)
    } else {
      setFastMovers([])
    }

    const { count } = await supabase
   .from('products')
   .select('*', { count: 'exact', head: true })
   .eq('store_id', storeId)
    setTotalProducts(count || 0)

    const { data: allProductsData } = await supabase
   .from('products')
   .select('quantity, cost_price, selling_price')
   .eq('store_id', storeId)
   .gt('quantity', 0)

    const profit = allProductsData?.reduce((sum, p) =>
      sum + (Number(p.quantity) * (Number(p.selling_price) - Number(p.cost_price))), 0) || 0
    setProjectedProfit(profit)

    const stockValue = allProductsData?.reduce((sum, p) =>
      sum + (Number(p.quantity) * Number(p.cost_price)), 0) || 0
    setTotalStockValue(stockValue)

    setLoading(false)
  }

  function formatNaira(amount: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  function formatDateTime(dateStr: string) {
    return format(new Date(dateStr), 'h:mm a')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Sales Today',
      value: formatNaira(stats?.todayRevenue || 0),
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Profit Today',
      value: formatNaira(stats?.todayProfit || 0),
      icon: TrendingUp,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStockCount || 0,
      icon: AlertTriangle,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600'
    },
    {
      title: 'Total Stock Value',
      value: formatNaira(totalStockValue),
      icon: Coins,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600'
    },
    {
      title: 'Total Products',
      value: totalProducts,
      icon: ShelvingUnit,
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    },
    {
      title: 'Customers Today',
      value: stats?.todaySales || 0,
      icon: Users,
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-600'
    },
    {
      title: 'Staff Online',
      value: 1,
      icon: User,
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-700'
    },
    {
      title: 'Total Stock Profit',
      value: formatNaira(projectedProfit),
      icon: HandCoins,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-700'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <Card key={idx} className="bg-white border-slate-200 rounded">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`p-3 rounded ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">{card.title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 text-center">
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-slate-700 text-center">Receipt</TableHead>
                    <TableHead className="text-slate-700 text-center">Time</TableHead>
                    <TableHead className="text-slate-700 text-center">Staff</TableHead>
                    <TableHead className="text-slate-700 text-center">Total</TableHead>
                    <TableHead className="text-slate-700 text-center">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.length > 0? recentSales.map((sale) => (
                    <TableRow key={sale.receipt_no} className="border-slate-100">
                      <TableCell className="font-medium text-slate-900 text-center">{sale.receipt_no}</TableCell>
                      <TableCell className="text-slate-600 text-center">{formatDateTime(sale.created_at)}</TableCell>
                      <TableCell className="text-slate-600 text-center">{sale.staff_name || 'System'}</TableCell>
                      <TableCell className="text-slate-900 text-center">{formatNaira(Number(sale.total))}</TableCell>
                      <TableCell className="text-green-600 font-medium text-center">{formatNaira(Number(sale.profit || 0))}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        No sales yet today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 rounded">
          <CardHeader className="border-b border-slate-200 text-center">
            <CardTitle className="text-lg font-semibold text-slate-900">Fast Moving Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-slate-700 text-center">Product Name</TableHead>
                    <TableHead className="text-slate-700 text-center">Qty Sold</TableHead>
                    <TableHead className="text-slate-700 text-center">Revenue</TableHead>
                    <TableHead className="text-slate-700 text-center">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fastMovers.length > 0? fastMovers.map((product, idx) => (
                    <TableRow key={idx} className="border-slate-100">
                      <TableCell className="font-medium text-slate-900 text-center">{product.product_name}</TableCell>
                      <TableCell className="text-slate-600 text-center">{product.qty}</TableCell>
                      <TableCell className="text-slate-900 text-center">{formatNaira(product.revenue)}</TableCell>
                      <TableCell className="text-green-600 font-medium text-center">{formatNaira(product.profit)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        No sales data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}