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

  // 2. Fetch sales for period - REMOVED status column
  const { data: sales, error: salesError } = await supabase
.from('sales')
.select(`
      id,
      created_at,
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

  // All sales are valid since we don't have voided status
  const allItems = sales.flatMap(s => s.sale_items)
  const voidedItems: any[] = [] // No voided tracking yet

  // 3. Core metrics
  const revenue = allItems.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0)
  const cogs = allItems.reduce((sum, item) => sum + (Number(item.cost_price) * item.quantity), 0)
  const profit = revenue - cogs
  const profitOnEachSale = revenue > 0? (profit / revenue) * 100 : 0

  // 4. Category Profit Engine
  const categoryMap = new Map<string, { revenue: number; profit: number; units: number }>()
  allItems.forEach(item => {
    const categoryName = (item.products as any)?.categories?.name || 'Uncategorized'
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

  // 5. Business Health Score
  const momentum = profitOnEachSale > 15? 'Accelerating' : profitOnEachSale > 8? 'Stable' : 'Declining'
  const momentum_score = Math.min(10, Math.max(0, profitOnEachSale / 2))
  const risk_level = profitOnEachSale < 5? 'High' : profitOnEachSale < 12? 'Moderate' : 'Low'
  const risk_score = Math.round(100 - (profitOnEachSale * 4))

  const health_score = Math.min(100, Math.round(
    (profitOnEachSale * 2.5) +
    (momentum === 'Accelerating'? 25 : momentum === 'Stable'? 15 : 0) +
    (risk_level === 'Low'? 25 : risk_level === 'Moderate'? 15 : 0)
  ))

  // 6. What Is Killing Your Profit - removed voided sales section
  const profit_leaks: { 
  item: string
  reason: string
  loss_naira: number
  items?: any[] 
}[] = []

  // 6a. Items With Small Profit
  const lowProfitItemDetails: {
    name: string
    cost_price: number
    unit_price: number
    quantity: number
    profit_per_unit: number
    total_loss: number
  }[] = []

  let lowProfitLoss = 0

  allItems.forEach(item => {
    const costPrice = Number(item.cost_price)
    const unitPrice = Number(item.unit_price)
    const qty = item.quantity
    const profitPerUnit = unitPrice - costPrice
    const profitPerSale = unitPrice > 0 ? (profitPerUnit / unitPrice) * 100 : 0

    if (profitPerSale < 15 && profitPerUnit > 0) {
      const actualProfit = profitPerUnit * qty
      const targetProfit = unitPrice * qty * 0.15
      const lossForItem = Math.max(0, targetProfit - actualProfit)
      
      lowProfitLoss += lossForItem

      lowProfitItemDetails.push({
        name: (item.products as any)?.name || 'Unknown Item',
        cost_price: costPrice,
        unit_price: unitPrice,
        quantity: qty,
        profit_per_unit: Number(profitPerUnit.toFixed(2)),
        total_loss: Number(lossForItem.toFixed(2))
      })
    }
  })

  if (lowProfitLoss > 0) {
    // Sort worst offenders first
    lowProfitItemDetails.sort((a, b) => b.total_loss - a.total_loss)
    
    profit_leaks.push({
      item: 'Items With Small Profit',
      reason: `${lowProfitItemDetails.length} items sold with less than ₦15 profit on each ₦100 sale`,
      loss_naira: Math.round(lowProfitLoss),
      items: lowProfitItemDetails.slice(0, 20) // NEW: Cap at 20 items
    })
  }

  // 6b. Dead Stock
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
      item: 'Goods Not Selling',
      reason: `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(deadStockValue)} of goods have not sold in 3 months`,
      loss_naira: Math.round(deadStockValue * 0.3)
    })
  }

  // 7. Opportunity Value
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

// 9. AI Briefing with no "margin" word
const aiPrompt = `
You are talking to a Nigerian shop owner who may not have finished school.
Use very simple words. Never use "margin". Say "profit on each sale" or "profit per ₦100 sold".

Data for ${periodLabel}:
- Total money made: ₦${revenue.toLocaleString()}
- Total profit: ₦${profit.toLocaleString()}
- Profit on each sale: ${profitOnEachSale.toFixed(1)}%
- Top category: ${category_profit[0]?.category || 'None'}
- Profit per ₦100 from top category: ₦${category_profit[0]?.naira_per_100 || 0}
- Business is: ${momentum}
- Risk: ${risk_level}
- Money being lost: ₦${opportunity_value.toLocaleString()}

Task 1: Write "ceo_briefing" in 4 sentences. Explain money made, profit on each sale, top category, and one advice.
Task 2: Write "insights" array with 1-2 items. Each needs message + impact_naira. Make message simple: "Sell more X because you make ₦Y profit on every ₦100 sold"

Return JSON only: {"ceo_briefing": "...", "insights": [{"message": "...", "impact_naira": 0}]}
`

let ceo_briefing = `${periodLabel} you made ${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(revenue)}. Your profit on each sale was ${profitOnEachSale.toFixed(1)}%. Your business is ${momentum.toLowerCase()}.`
let insights: any[] = []

try {
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: aiPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    })

    if (aiRes.ok) {
      const aiData = await aiRes.json()
      const rawContent = aiData.choices[0]?.message?.content
      if (!rawContent || rawContent.trim() === "" || rawContent === "{}") {
        throw new Error('OpenAI returned an empty JSON wrapper string')
      }

      const parsed = JSON.parse(rawContent)
      
      // Strict validation: if fields are empty, undefined, or wrong shapes, drop to fallback
      if (!parsed.ceo_briefing || !parsed.insights || !Array.isArray(parsed.insights) || parsed.insights.length === 0) {
        throw new Error('OpenAI JSON layout does not contain valid content values')
      }

      ceo_briefing = parsed.ceo_briefing
      insights = parsed.insights.map((i: any) => ({ type: 'ai', ...i }))
    }
  }
} catch (e) {
  console.error('AI briefing failed:', e)
}

// FALLBACK: Runs if AI failed OR returned empty insights
if (insights.length === 0) {
  if (category_profit.length > 0) {
    insights = [{
      type: 'category',
      message: `${category_profit[0].category} gives you ₦${category_profit[0].naira_per_100} profit on every ₦100 sold. Keep it in stock.`,
      impact_naira: Math.round(category_profit[0].profit * 0.2)
    }]
  } else if (profit > 0) {
    insights = [{
      type: 'profit',
      message: `You made ₦${profit.toLocaleString()} profit at ${profitOnEachSale.toFixed(1)}% profit on each sale. Aim for 15%+ to grow faster.`,
      impact_naira: Math.round(revenue * 0.15 - profit)
    }]
  } else {
    insights = [{
      type: 'sales',
      message: `You had ${allItems.length} sales this period. Add cost prices to track profit and unlock insights.`,
      impact_naira: 0
    }]
  }
}

  // 10. Upsert
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