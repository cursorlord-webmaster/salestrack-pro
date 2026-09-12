import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { token, tokenId, storeId, ownerEmail } = await req.json()

    if (!token ||!tokenId ||!storeId ||!ownerEmail) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // 1. Verify token still valid
    const { data: tokenRow } = await adminClient.from('onboarding_tokens').select('*').eq('id', tokenId).eq('token', token).single()

    if (!tokenRow || tokenRow.used_at) {
      return NextResponse.json({ error: 'Token already used or invalid' }, { status: 400 })
    }

    // 2. Log evidence
    await adminClient.from('eula_acceptances').insert({
      store_id: storeId,
      token_id: tokenId,
      email: ownerEmail,
      ip: ip === 'unknown'? null : ip,
      user_agent: userAgent,
    })

    // 3. Mark token as used
    await adminClient
     .from('onboarding_tokens')
     .update({
        has_accepted_eula: true,
        accepted_at: new Date().toISOString(),
        accepted_ip: ip === 'unknown'? null : ip,
        accepted_user_agent: userAgent,
        used_at: new Date().toISOString(),
      })
     .eq('id', tokenId)

    // 4. Update profiles
    const { data: profile } = await adminClient.from('profiles').select('id').eq('store_id', storeId).eq('email', ownerEmail).single()

    if (profile) {
      await adminClient
       .from('profiles')
       .update({
          has_accepted_eula: true,
          eula_accepted_at: new Date().toISOString(),
          eula_ip: ip === 'unknown'? null : ip,
        })
       .eq('id', profile.id)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Acceptance logging failed' }, { status: 500 })
  }
}