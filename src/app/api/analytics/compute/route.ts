import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths,
  startOfYear, endOfYear, subYears,
  format, subDays
} from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type PeriodType = 'week' | 'month' | '3m' | '6m' | 'year'

export async function POST(req: NextRequest) {
  const { store_id, period_type = 'week' }: { store_id: string, period_type: PeriodType } = await req.json()

  if (!store_id) return NextResponse.json({ error: 'store_id required' }, { status: 400 })

  // 1. Calculate period dates
  const now = new Date()
  let periodStart: Date, periodEnd: Date

  switch (period_type) {
    case 'week':
      periodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      periodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      break
    case 'month':
      periodStart = startOfMonth(subMonths(now, 1))
      periodEnd = endOfMonth(subMonths(now, 1))
      break
    case '3m':
      periodEnd = endOfMonth(subMonths(now, 1))
      periodStart = startOfMonth(subMonths(now, 3))
      break
    case '6m':
      periodEnd = endOfMonth(subMonths(now, 1))
      periodStart = startOfMonth(subMonths(now, 6))
      break
    case 'year':
      periodStart = startOfYear(subYears(now, 1))
      periodEnd = endOfYear(subYears(now, 1))
      break
    default:
      return NextResponse.json({ error: 'Invalid period_type' }, { status: 400 })
  }

  const periodStartStr = format(periodStart, 'yyyy-MM-dd')
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd')

  // 2. Fetch sales for period
  const { data: sales, error: salesError } = await supabase
 .from('sales')
 .select(`
      id,
      created_at,
      status,
      sale_items!inner(
        quantity,
        unit_price,
        cost_price,
        product_id,
        products!inner(
          name,
          category_id,
          categories(name)
        )
      )
    `)
 .eq('store_id', store_id)
 .gte('created_at', `${periodStartStr}T00:00:00`)
 .lte('created_at', `${periodEndStr}T23:59:59`)

  if (salesError) {
    return NextResponse.json({ error: 'Failed to fetch sales: ' + salesError.message }, { status: 500 })
  }

  if (!sales || sales.length === 0) {
    return NextResponse.json({ error: `No sales data for ${period_type}` }, { status: 404 })
  }

  // Filter out voided sales for revenue calculations
  const completedSales = sales.filter(s => s.status!== 'voided')
  const voidedSales = sales.filter(s => s.status === 'voided')
  const allItems = completedSales.flatMap(s => s.sale_items)
  const voidedItems = voidedSales.flatMap(s => s.sale_items)

  // 3. Core metrics
  const revenue = allItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0)
  const cogs = allItems.reduce((sum, item) => sum + (Number(item.cost_price) * item.quantity), 0)
  const profit = revenue - cogs
  const profitMargin = revenue > 0? (profit / revenue) * 100 : 0

  // 4. Category Profit Engine
  const categoryMap = new Map<string, { revenue: number; profit: number; units: number }>()
  allItems.forEach(item => {
    const categoryName = item.products?.categories?.name || 'Uncategorized'
    const itemRevenue = Number(item.unit_price) * item.quantity
    const itemProfit = (Number(item.unit_price) - Number(item.cost_price)) * item.quantity

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, { revenue: 0, profit: 0, units: 0 })
    }
    const cat = categoryMap.get(categoryName)!
    cat.revenue += itemRevenue
    cat.profit += itemProfit
    cat.units += item.quantity
  })

  const category_profit = Array.from(categoryMap.entries()).map(([name, data]) => ({
    category: name,
    revenue: data.revenue,
    profit: data.profit,
    margin_percent: data.revenue > 0? (data.profit / data.revenue) * 100 : 0,
    units_sold: data.units,
    naira_per_100: data.revenue > 0? Math.round((data.profit / data.revenue) * 100) : 0
  })).sort((a, b) => b.profit - a.profit)

  // 5. REAL Business Health Score
  const momentum = profitMargin > 15? 'Accelerating' : profitMargin > 8? 'Stable' : 'Declining'
  const momentum_score = Math.min(10, Math.max(0, profitMargin / 2))
  const risk_level = profitMargin < 5? 'High' : profitMargin < 12? 'Moderate' : 'Low'
  const risk_score = Math.round(100 - (profitMargin * 4))

  const health_score = Math.min(100, Math.round(
    (profitMargin * 2.5) + // 0-50 points for margin
    (momentum === 'Accelerating'? 25 : momentum === 'Stable'? 15 : 0) + // 0-25 points
    (risk_level === 'Low'? 25 : risk_level === 'Moderate'? 15 : 0) // 0-25 points
  ))

  // 6. REAL What Is Killing My Profit
  const profit_leaks: { item: string; reason: string; loss_naira: number }[] = []

  // 6a. Low Margin Items - items sold below 15% margin
  const lowMarginItems = allItems.filter(item => {
    const margin = (Number(item.unit_price) - Number(item.cost_price)) / Number(item.unit_price) * 100
    return margin < 15
  })
  const lowMarginLoss = lowMarginItems.reduce((sum, item) => {
    const actualProfit = (Number(item.unit_price) - Number(item.cost_price)) * item.quantity
    const targetProfit = Number(item.unit_price) * item.quantity * 0.15 // 15% target
    return sum + Math.max(0, targetProfit - actualProfit)
  }, 0)

  if (lowMarginLoss > 0) {
    profit_leaks.push({
      item: 'Low Margin Items',
      reason: `${lowMarginItems.length} items sold below 15% margin`,
      loss_naira: Math.round(lowMarginLoss)
    })
  }

  // 6b. Voided Sales
  const voidedLoss = voidedItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0)
  if (voidedLoss > 0) {
    profit_leaks.push({
      item: 'Voided Sales',
      reason: `${voidedSales.length} transactions voided this period`,
      loss_naira: Math.round(voidedLoss)
    })
  }

  // 6c. Dead Stock - inventory not sold in 90 days
  const ninetyDaysAgo = format(subDays(now, 90), 'yyyy-MM-dd')
  const { data: deadStock } = await supabase
   .from('inventory')
   .select('quantity, cost_price, products(name)')
   .eq('store_id', store_id)
   .lt('last_sale_date', ninetyDaysAgo)
   .gt('quantity', 0)

  const deadStockValue = deadStock?.reduce((sum, item) => sum + (Number(item.cost_price) * item.quantity), 0) || 0
  if (deadStockValue > 0) {
    profit_leaks.push({
      item: 'Slow Moving Stock',
      reason: `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(deadStockValue)} tied in dead stock`,
      loss_naira: Math.round(deadStockValue * 0.3) // 30% of value as opportunity cost
    })
  }

  // 7. REAL Opportunity Value = sum of all leaks
  const opportunity_value = profit_leaks.reduce((sum, leak) => sum + leak.loss_naira, 0)

  // 8. Projections
  const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  const dailyAvgRevenue = revenue / daysInPeriod
  const dailyAvgProfit = profit / daysInPeriod

  const forecast_3m = {
    revenue: Math.round(dailyAvgRevenue * 90),
    profit: Math.round(dailyAvgProfit * 90),
    confidence: 'Medium' as const
  }
  const forecast_6m = {
    revenue: Math.round(dailyAvgRevenue * 180),
    profit: Math.round(dailyAvgProfit * 180),
    confidence: 'Medium' as const
  }
  const forecast_12m = {
    revenue: Math.round(dailyAvgRevenue * 365),
    profit: Math.round(dailyAvgProfit * 365),
    confidence: 'Low' as const
  }

  const periodLabel = period_type === 'week'? 'Last week' :
                      period_type === 'month'? 'Last month' :
                      period_type === '3m'? 'Last 3 months' :
                      period_type === '6m'? 'Last 6 months' : 'Last year'

  const ceo_briefing = `${periodLabel} you generated ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(revenue)} in revenue with ${profitMargin.toFixed(1)}% margin. Your top category is ${category_profit[0]?.category || 'N/A'} contributing ₦${category_profit[0]?.naira_per_100 || 0} profit per ₦100 sold. Business momentum is ${momentum}.`

  const insights = category_profit.length > 0? [
    {
      type: 'category',
      message: `${category_profit[0].category} delivers ${category_profit[0].margin_percent.toFixed(1)}% margin (₦${category_profit[0].naira_per_100} profit per ₦100 sold). Focus inventory here.`,
      impact_naira: Math.round(category_profit[0].profit * 0.2)
    }
  ] : []

  // 9. Upsert with REAL data - null if no data
  const { data: snapshot, error } = await supabase
 .from('business_analytics_snapshots')
 .upsert({
      store_id,
      period_type,
      period_start: periodStartStr,
      period_end: periodEndStr,
      week_start: period_type === 'week'? periodStartStr : null,
      week_end: period_type === 'week'? periodEndStr : null,
      momentum,
      momentum_score,
      risk_level,
      risk_score,
      opportunity_value,
      forecast_3m,
      forecast_6m,
      forecast_12m,
      ceo_briefing,
      insights,
      category_profit,
      health_score,
      profit_leaks: profit_leaks.length > 0? profit_leaks : null
    }, { onConflict: 'store_id,period_type,period_start' })
 .select()
 .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ snapshot })
}