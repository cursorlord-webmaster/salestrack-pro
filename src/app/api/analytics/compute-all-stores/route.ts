// src/app/api/analytics/compute-all-stores/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  // 1. Calculate last completed week (Mon-Sun)
  const now = new Date()
  const periodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const periodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const periodStartStr = format(periodStart, 'yyyy-MM-dd')
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd')

  // 2. Get all active stores
  const { data: stores } = await supabase.from('stores').select('id').eq('status', 'active')
  if (!stores || stores.length === 0) {
    return NextResponse.json({ error: 'No active stores' }, { status: 404 })
  }

  let updated = 0
  for (const store of stores) {
    // 3. Call internal compute logic via direct POST to same supabase function
    // Instead of fetch, we call the compute route internally by inserting directly
    // Simplified: just trigger existing compute endpoint via supabase edge
    const res = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/analytics/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: store.id, period_type: 'week' })
    }).catch(() => null)

    // 4. Create user_alerts for all store_owners so modal shows
    const { data: owners } = await supabase.from('profiles').select('id').eq('store_id', store.id).eq('role', 'store_owner').eq('active', true)
    
    if (owners) {
      for (const owner of owners) {
        await supabase.from('user_alerts').upsert({
          user_id: owner.id,
          store_id: store.id,
          alert_type: 'weekly_briefing',
          period_end: periodEndStr,
          period_start: periodStartStr,
          seen_at: null
        }, { onConflict: 'user_id,alert_type,period_end' })
      }
    }
    updated++
  }

  return NextResponse.json({ updated, period: `${periodStartStr} to ${periodEndStr}` })
}