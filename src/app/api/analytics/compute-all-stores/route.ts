export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const now = new Date()
  const periodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const periodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const periodStartStr = format(periodStart, 'yyyy-MM-dd')
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd')

  // Use your live domain - NOT VERCEL_URL
  const baseUrl = 'https://www.salestrackpro.store'

  const { data: stores, error } = await supabase.from('stores').select('id').eq('status', 'active')
  if (error || !stores?.length) {
    return NextResponse.json({ error: 'no stores', details: error }, { status: 500 })
  }

  const results = []
  for (const store of stores) {
    try {
      const res = await fetch(`${baseUrl}/api/analytics/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.id, period_type: 'week' }),
        cache: 'no-store'
      })
      const json = await res.json()

      // Create briefing alert for modal
      const { data: owners } = await supabase.from('profiles').select('id').eq('store_id', store.id).eq('role', 'store_owner').eq('active', true)
      if (owners?.length) {
        for (const o of owners) {
          await supabase.from('user_alerts').upsert({
            user_id: o.id,
            store_id: store.id,
            alert_type: 'weekly_briefing',
            period_end: periodEndStr,
            period_start: periodStartStr,
          }, { onConflict: 'user_id,alert_type,period_end' })
        }
      }

      results.push({ store: store.id, status: res.status, result: json })
    } catch (e: any) {
      results.push({ store: store.id, error: e.message })
    }
  }

  return NextResponse.json({ 
    period: `${periodStartStr} to ${periodEndStr}`,
    results 
  })
}