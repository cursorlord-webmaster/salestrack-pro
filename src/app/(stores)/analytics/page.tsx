'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  ArrowUpDown, AlertTriangle, TrendingUpDown, HandCoins, BookOpenText,
  Gauge, NotebookPen, Calendar, HeartPulse, TrendingDown
} from 'lucide-react'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
  profit_leaks?: { item: string; reason: string; loss_naira: number }[]
}


const PERIOD_LABELS: Record<PeriodType, string> = {
  week: 'Last Week',
  month: 'Last Month',
  '3m': 'Last 3 Months',
  '6m': 'Last 6 Months',
  year: 'Last Year'
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week')
  const [showCategoryModal, setShowCategoryModal] = useState(false)  // ← ADD THIS LINE HERE

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
          <h2 className="text-2xl font-bold text-slate-900">CEO Command Center</h2>
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
            <Card className="bg-white border-slate-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`p-3 rounded ${getHealthColor(snapshot.health_score || 82)}`}>
                    <HeartPulse className="h-6 w-6" />
                  </div>
<div>
  <p className="text-sm text-slate-600">Store Health Score</p>
  <h3 className="text-xl font-bold text-slate-900 mt-1">{snapshot.health_score ?? 0}/100</h3>
  <p className="text-xs text-slate-500 mt-1">{snapshot.health_score >= 80? 'Healthy' : snapshot.health_score >= 60? 'Stable' : 'At Risk'}</p>
</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-6">
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
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-6">
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
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded bg-violet-50 text-violet-600">
                    <HandCoins className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Opportunity Metrics</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{formatNaira(snapshot.opportunity_value || 0)}</h3>
                    <p className="text-xs text-slate-500 mt-1">Recoverable</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded bg-blue-50 text-blue-600">
                    <BookOpenText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">3-Month Forecast</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{formatNaira(snapshot.forecast_3m.revenue)}</h3>
                    <div className="mt-1">{getConfidenceBadge(snapshot.forecast_3m.confidence)}</div>
                  </div>
                </div>
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
          <TrendingUpDown className="h-5 w-5" />
          Category Profit Engine
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
          <DialogTitle className="text-lg font-semibold text-slate-900 flex items-center justify-between">
            All Categories - {PERIOD_LABELS[selectedPeriod]}
            <button 
              onClick={() => setShowCategoryModal(false)}
              className="rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
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
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  What Is Killing My Profit?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
<div className="space-y-4">
  {snapshot.profit_leaks && snapshot.profit_leaks.length > 0 ? (
    snapshot.profit_leaks.slice(0, 3).map((leak, idx) => (
      <div key={idx} className="flex items-start gap-4 p-4 bg-red-50 rounded border border-red-100">
        <div className="shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{leak.item}</p>
          <p className="text-xs text-slate-600 mt-0.5">{leak.reason}</p>
          <p className="text-xs text-red-700 font-semibold mt-1">
            Est. Loss: {formatNaira(leak.loss_naira)}
          </p>
        </div>
      </div>
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

          {/* Forecasts - UNCHANGED */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: '3 Months', data: snapshot.forecast_3m },
              { label: '6 Months', data: snapshot.forecast_6m },
              { label: '12 Months', data: snapshot.forecast_12m }
            ].map((f) => (
              <Card key={f.label} className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-slate-900 text-center">
                    {f.label} Projection
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
            <TrendingUpDown className="h-5 w-5 text-emerald-600 mt-0.5" />
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
        <TrendingUpDown className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-medium">No key actions this period</p>
        <p className="text-xs mt-1">Make more sales to generate insights</p>
      </div>
    )}
  </div>
</CardContent>
          </Card>
        </>
      )}
    </div>
  )
}