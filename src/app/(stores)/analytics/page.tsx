'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowUpDown, AlertTriangle, OctagonAlert, HandCoins, Calculator, TrendingDown, ChevronDown, ChartNoAxesCombined,
  Gauge, NotebookPen, Calendar, Stethoscope, Check, Info
} from 'lucide-react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

type PeriodType = 'week' | 'month' | '3m' | '6m' | 'year'

type Snapshot = {
  id: string
  period_type: PeriodType
  period_start: string
  period_end: string
  momentum: 'Accelerating' | 'Stable' | 'Declining'
  momentum_score: number
  risk_level: 'Low' | 'Moderate' | 'High'
  risk_score: number
  opportunity_value: number
  forecast_3m: { revenue: number; profit: number; confidence: 'High' | 'Medium' | 'Low' }
  forecast_6m: { revenue: number; profit: number; confidence: 'High' | 'Medium' | 'Low' }
  forecast_12m: { revenue: number; profit: number; confidence: 'High' | 'Medium' | 'Low' }
  ceo_briefing: string
  insights: { type: string; message: string; impact_naira: number }[]
  category_profit?: { category: string; revenue: number; profit: number; margin_percent: number; units_sold: number; naira_per_100: number }[]
  health_score?: number
  profit_leaks?: { 
    item: string; 
    reason: string; 
    loss_naira: number; 
    items?: {
      name: string;
      cost_price: number;
      unit_price: number;
      quantity: number;
      total_loss: number;
    }[];
  }[]
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  week: 'Last Week',
  month: 'Last Month',
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  year: 'Last Year'
}

const EXPLANATIONS = {
  health: {
    title: 'How Store Health Score Is Calculated',
    body: `SalesTrack Pro's Accounting Intelligence computes 3 things about your business to arrive at your store's health score:

1. Your Profit Margin
Are you making enough money on what you sell? Higher margins = higher score.

2. Sales Momentum
Are your sales growing or dropping? Growing sales = higher score.

3. Risk Level
Is your business safe or in danger? Low risk = higher score.

Formula Used:
Health Score = (Profit Margin × 2.5) + Momentum Points + Risk Points

Where:
• Profit Margin = (Total Profit ÷ Total Revenue) × 100
• Momentum Points: Accelerating = 25, Stable = 15, Declining = 0
• Risk Points: Low = 25, Moderate = 15, High = 0
• Final score capped at 100

What Your Score Means:
80 to 100 = Healthy - Your business is doing great. Keep it up.
60 to 79 = Stable - You’re okay, but watch your profit margins.
Below 60 = At Risk - Your margins are too low or sales are falling. Fix this fast.

Example: If your profit margin is 18%, sales are growing, and risk is low, your score = (18 × 2.5) + 25 + 25 = 95. That is a very high store health score!`
  },
  momentum: {
    title: 'How Business Momentum Works',
    body: `Momentum tells you if your sales are going UP or DOWN.

Formula Used:
Change % = ((This Period Revenue - Last Period Revenue) ÷ Last Period Revenue) × 100

Then:
• Accelerating = Change % is +10% or more
• Stable = Change % is between -10% and +10% 
• Declining = Change % is -10% or worse

Our software calculates this by comparing this period's revenue and profit with the previous period of the same duration.

If momentum is Declining, check your fast-selling products and make sure they are in stock.

Example: Last month ₦500,000, this month ₦580,000. Change = ((580,000 - 500,000) ÷ 500,000) × 100 = +16%. Result: Accelerating.`
  },
  risk: {
    title: 'How Risk Meter Is Calculated',
    body: `Risk Meter shows dangers in your business as seen in the sales activities of your store at the moment.

Formula Used:
Risk Score = 100 - (Profit Margin × 4)

Then:
• Low Risk = Score 0 to 40. Stock levels good, no major losses, sales steady
• Moderate Risk = Score 41 to 70. Some products running low, or small losses detected
• High Risk = Score 71 to 100. Many out-of-stock items, big losses, or sales dropping fast

The software also checks your store's stock health, profit leaks, and audit issues to confirm the level.

To lower your risk, check and resolve what you see in "What Is Killing Your Profit" section on this page.

Example: If your profit margin is 5%, Risk Score = 100 - (5 × 4) = 80. Result: High Risk.`
  },
  opportunity: {
    title: 'How Profit Opportunities Is Calculated',
    body: `Profit Opportunities simply means 'The Money' you can recover based on the sales record seen at this period.

Formula Used:
Opportunity Value = Sum of All Losses Found

These are the 3 areas where losses are coming from:
1. Items With Small Profit
   Loss = (Target 15% Profit - Actual Profit) × Quantity sold
2. Goods Not Selling 
   Loss = 30% of Cost Value of items unsold for 90+ days
3. Voided/Deleted Sales
   Loss = Profit you would have made on those sales

So, Profit Opportunities simply means the estimated Naira you can gain if you act on the suggestions generated on this page by the Software's Accounting Intelligence.

Check "Key Actions This Period" to see exactly what to do from time to time.

Example: Small profit loss ₦352 + Dead stock loss ₦8,400 = ₦8,752 Profit Opportunity.`
  },
  forecast: {
    title: 'How the 3 Month Forecast is Derived',
    body: `Forecast predicts your store's future revenue and profit.

Formula Used:
Step 1: Daily Average = Total Revenue ÷ Days in Period
Step 2: 3 Month Forecast = Daily Average × 90 days

Same calculation for profit: Daily Profit × 90 days

Confidence Level:
High: You have 3+ months of consistent sales data
Medium: You have 1-3 months of sales data  
Low: Less than 1 month of sales data

Forecasts change if you run promos, add new products, or sales speed up or slow down.

Example: If last week's revenue was ₦210,000. Daily Average = 210,000 ÷ 7 (days) = ₦30,000. 3 Month Forecast = 30,000 × 90 = ₦2,700,000.`
  }
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [activeModal, setActiveModal] = useState<keyof typeof EXPLANATIONS | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data } = await supabase.from('profiles').select('store_id').eq('id', user.id).single()
      return data
    }
  })

  const { data: snapshot, isLoading, refetch } = useQuery({
    queryKey: ['analytics-snapshot', profile?.store_id, selectedPeriod],
    queryFn: async (): Promise<Snapshot | null> => {
      if (!profile?.store_id) return null

      // 1. Try to fetch existing snapshot for period
      const { data: existing } = await supabase
      .from('business_analytics_snapshots')
      .select('*')
      .eq('store_id', profile.store_id)
      .eq('period_type', selectedPeriod)
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()

      // 2. If no snapshot, compute it
      if (!existing) {
        const res = await fetch('/api/analytics/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: profile.store_id, period_type: selectedPeriod })
        })

        if (!res.ok) return null
        const { snapshot: newSnapshot } = await res.json()
        return newSnapshot
      }

      return existing
    },
    enabled:!!profile?.store_id
  })

  function formatNaira(amount: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getMomentumColor = (m: string) => {
    if (m === 'Accelerating') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (m === 'Declining') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }

  const getRiskColor = (r: string) => {
    if (r === 'Low') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (r === 'High') return 'bg-red-50 text-red-700 border-red-200'
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  const getConfidenceBadge = (c: string) => {
    const colors = {
      High: 'bg-emerald-600',
      Medium: 'bg-amber-600',
      Low: 'bg-red-600'
    }
    return <Badge className={`${colors[c as keyof typeof colors]} text-white`}>{c}</Badge>
  }

  const periodLabel = snapshot
  ? `${PERIOD_LABELS[snapshot.period_type]}: ${format(new Date(snapshot.period_start), 'MMM d, yyyy')} - ${format(new Date(snapshot.period_end), 'MMM d, yyyy')}`
    : PERIOD_LABELS[selectedPeriod]
	
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
         <h2 className="text-xl font-semibold text-slate-900">Your Personal Investment Consultant</h2>
          <p className="text-sm text-slate-600 mt-1">{periodLabel} • Updated Sunday 11:59pm</p>
        </div>
        <Select value={selectedPeriod} onValueChange={(v: PeriodType) => setSelectedPeriod(v)}>
          <SelectTrigger className="w-48 text-slate-900">
            <SelectValue>{PERIOD_LABELS[selectedPeriod]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
	
      {isLoading? (
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-600">Loading CEO Command Center...</div>
        </div>
      ) :!snapshot? (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Calendar className="h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Analytics Yet</h3>
          <p className="text-slate-600 max-w-md">
            Analytics for {PERIOD_LABELS[selectedPeriod]} will generate automatically. Check back after the period ends.
          </p>
        </div>
      ) : (
        <>
          {/* Power Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* NEW: Business Health Score */}
            <Card className="bg-white border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`p-3 rounded ${getHealthColor(snapshot.health_score || 82)}`}>
                    <Stethoscope className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Store Health Score</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{snapshot.health_score?? 0}/100</h3>
                    <p className="text-xs text-slate-500 mt-1">{(snapshot.health_score?? 0) >= 80? 'Healthy' : (snapshot.health_score?? 0) >= 60? 'Stable' : 'At Risk'}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-slate-700"
                  onClick={() => setActiveModal('health')}
                >
                  <Info className="h-3 w-3 mr-1" /> Learn More
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`p-3 rounded ${getMomentumColor(snapshot.momentum)}`}>
                    <ArrowUpDown className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Business Momentum</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{snapshot.momentum}</h3>
                    <p className="text-xs text-slate-500 mt-1">Score: {snapshot.momentum_score.toFixed(1)}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-slate-700"
                  onClick={() => setActiveModal('momentum')}
                >
                  <Info className="h-3 w-3 mr-1" /> Learn More
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`p-3 rounded ${getRiskColor(snapshot.risk_level)}`}>
                    <Gauge className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Risk Meter</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{snapshot.risk_level}</h3>
                    <p className="text-xs text-slate-500 mt-1">Score: {snapshot.risk_score}/100</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-slate-700"
                  onClick={() => setActiveModal('risk')}
                >
                  <Info className="h-3 w-3 mr-1" /> Learn More
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded bg-violet-50 text-violet-600">
                    <HandCoins className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Profit Opportunities</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{formatNaira(snapshot.opportunity_value || 0)}</h3>
                    <p className="text-xs text-slate-500 mt-1">Recoverable</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-slate-700"
                  onClick={() => setActiveModal('opportunity')}
                >
                  <Info className="h-3 w-3 mr-1" /> Learn More
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded bg-blue-50 text-blue-600">
                    <ChartNoAxesCombined className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">3-Month Forecast</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{formatNaira(snapshot.forecast_3m.revenue)}</h3>
                    <div className="mt-1">{getConfidenceBadge(snapshot.forecast_3m.confidence)}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 text-slate-700"
                  onClick={() => setActiveModal('forecast')}
                >
                  <Info className="h-3 w-3 mr-1" /> Learn More
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* CEO Briefing */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-lg font-semibold text-slate-900 text-center flex items-center justify-center gap-2">
                <NotebookPen className="h-5 w-5" />
                Executive Briefing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap">
                {snapshot.ceo_briefing}
              </div>
            </CardContent>
          </Card>

{/* Intelligence Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Profit Engine */}
            {snapshot.category_profit && snapshot.category_profit.length > 0 && (
              <>
                <Card className="bg-white border-slate-200">
                  <CardHeader className="border-b border-slate-200">
                    <CardTitle className="text-lg font-semibold text-slate-900 text-center flex items-center justify-center gap-2">
                      Product Categories With High Profits
					   <HandCoins className="h-5 w-5" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {snapshot.category_profit.slice(0, 3).map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-8 rounded ${idx === 0? 'bg-emerald-500' : idx === 1? 'bg-blue-500' : 'bg-slate-300'}`} />
                              <div>
                                <p className="font-semibold text-slate-900">{cat.category}</p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                  {cat.units_sold} items sold • {formatNaira(cat.revenue)} revenue
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">{cat.margin_percent.toFixed(1)}%</p>
                            <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                              {formatNaira(cat.profit)} profit
                            </p>
                            <p className="text-xs text-slate-600">
                              ₦{cat.naira_per_100} per ₦100 sold
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {snapshot.category_profit.length > 3 && (
                      <button
                        onClick={() => setShowCategoryModal(true)}
                        className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Show All Categories ({snapshot.category_profit.length})
                      </button>
                    )}
                    <div className="mt-4 p-3 bg-violet-50 rounded border-violet-100">
                      <p className="text-xs text-violet-700 text-center">
                        <span className="font-semibold">CEO Tip:</span> {snapshot.category_profit[0]?.category} gives you the highest return. Stock more of it.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
                  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                      <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center justify-center">
                        All Categories - {PERIOD_LABELS[selectedPeriod]}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-4">
                      <div className="space-y-3">
                        {snapshot.category_profit.map((cat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-8 rounded ${
                                  idx === 0? 'bg-emerald-500' :
                                  idx === 1? 'bg-blue-500' :
                                  idx === 2? 'bg-amber-500' : 'bg-slate-300'
                                }`} />
                                <div>
                                  <p className="font-semibold text-slate-900">{cat.category}</p>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {cat.units_sold} items sold • {formatNaira(cat.revenue)} revenue
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-600">{cat.margin_percent.toFixed(1)}%</p>
                              <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                                {formatNaira(cat.profit)} profit
                              </p>
                              <p className="text-xs text-slate-600">
                                ₦{cat.naira_per_100} per ₦100 sold
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}

{/* NEW: What Is Killing My Profit */}
<Card className="bg-white border-slate-200">
  <CardHeader className="border-b border-slate-200">
    <CardTitle className="text-lg font-semibold text-slate-900 text-center flex items-center justify-center gap-2">
      What Is Killing Your Profit?
      <TrendingDown className="h-5 w-5 text-red-600" />
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <div className="space-y-3">
      {snapshot.profit_leaks && snapshot.profit_leaks.length > 0? (
        snapshot.profit_leaks.slice(0, 3).map((leak, idx) => (
          <details key={idx} className="group">
            <summary className="flex items-start gap-4 p-4 bg-red-50 rounded border border-red-100 cursor-pointer list-none hover:bg-red-100 transition-colors">
              <div className="shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{leak.item}</p>
                  {leak.items && leak.items.length > 0 && (
                    <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{leak.reason}</p>
                <p className="text-xs text-red-700 font-semibold mt-1">
                  Est. Loss: {formatNaira(leak.loss_naira)}
                </p>
              </div>
            </summary>

            {leak.items && leak.items.length > 0 && (
              <div className="mt-2 p-4 bg-white border border-red-100 rounded">
                <p className="text-xs font-semibold text-slate-700 mb-3">
                  Top {leak.items.length} items causing this loss:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="pb-2 font-medium">Item</th>
                        <th className="pb-2 font-medium text-right">Cost</th>
                        <th className="pb-2 font-medium text-right">Price</th>
                        <th className="pb-2 font-medium text-right">Qty</th>
                        <th className="pb-2 font-medium text-right">Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leak.items.map((item: any, itemIdx: number) => (
                        <tr key={itemIdx} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 pr-2 text-slate-900 font-medium">{item.name}</td>
                          <td className="py-2 text-right text-slate-600">{formatNaira(item.cost_price)}</td>
                          <td className="py-2 text-right text-slate-600">{formatNaira(item.unit_price)}</td>
                          <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                          <td className="py-2 text-right text-red-600 font-semibold">
                            {formatNaira(item.total_loss)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  *Loss = target 15% profit minus actual profit per item
                </p>
              </div>
            )}
          </details>
        ))
      ) : (
        <div className="text-center py-8">
          <TrendingDown className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-semibold text-slate-900">No Profit Leaks Detected</p>
          <p className="text-xs text-slate-600 mt-1">Your business is running efficiently this period</p>
        </div>
      )}
    </div>
  </CardContent>
</Card>
</div>

          {/* Forecasts - RENAMED TO FORECAST */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: '3 Months', data: snapshot.forecast_3m },
              { label: '6 Months', data: snapshot.forecast_6m },
              { label: '12 Months', data: snapshot.forecast_12m }
            ].map((f) => (
              <Card key={f.label} className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-slate-900 text-center">
                    {f.label} Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-2">
                  <div>
                    <p className="text-xs text-slate-600">Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNaira(f.data.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Profit</p>
                    <p className="text-lg font-semibold text-emerald-600">{formatNaira(f.data.profit)}</p>
                  </div>
                  <div className="pt-2">{getConfidenceBadge(f.data.confidence)} Confidence</div>
                </CardContent>
              </Card>
            ))}
          </div>

{/* Forecast Disclaimer Card */}
<Card className="bg-blue-50 border-blue-200">
  <CardContent className="p-4">
    <div className="flex flex-col items-center text-center gap-2">
      <div className="flex items-center justify-center gap-2">
        <p className="text-sm font-semibold text-blue-900">Forecast Calculation</p>
		<Calculator className="h-5 w-5 text-blue-600" />
      </div>
      <p className="text-xs text-blue-800 max-w-3xl">
The above forecasts are based on your store’s current sales momentum. If your sales continue exactly like they are today, these are the revenue and profit you’ll likely see 
in 3, 6, and 12 months. If sales go up or down, the figures will change. But what you are seeing are the exact forecasts based on the CURRENT sales records. 
Formula Used: Daily Average = Total Revenue ÷ Number of Days in the Period.
Therefore Months Forecast = Daily Average × 30, 60 and 90 days
      </p>
    </div>
  </CardContent>
</Card>

          {/* Key Insights - UNCHANGED */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-lg font-semibold text-slate-900 text-center">Key Actions This Period</CardTitle>
            </CardHeader>
           <CardContent className="p-6">
              <div className="space-y-4">
                {snapshot.insights && snapshot.insights.length > 0? (
                  snapshot.insights.map((insight, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded">
                      <div className="shrink-0">
                        <Check className="h-5 w-5 text-emerald-600 mt-0.5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{insight.message}</p>
                        <p className="text-xs text-emerald-700 font-semibold mt-1">
                          Est. Impact: {formatNaira(insight.impact_naira)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <OctagonAlert className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-medium">No key actions this period</p>
                    <p className="text-xs mt-1">Make more sales to generate insights</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

{/* Learn More Modal - Left-aligned body, centered header */}
<Dialog open={!!activeModal} onOpenChange={() => setActiveModal(null)}>
  <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
    <DialogHeader className="shrink-0">
      <DialogTitle className="text-center">{activeModal && EXPLANATIONS[activeModal].title}</DialogTitle>
      <DialogDescription className="sr-only">Explanation of metric</DialogDescription>
    </DialogHeader>
    <div className="overflow-y-auto flex-1 text-sm text-slate-700 whitespace-pre-line text-left px-1">
      {activeModal && EXPLANATIONS[activeModal].body}
    </div>
  </DialogContent>
</Dialog>
</div>
  )
}