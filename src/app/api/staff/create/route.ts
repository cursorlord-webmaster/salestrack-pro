import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, store_id')
      .eq('id', user.id)
      .single()

    if (!profile || !['store_owner', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { full_name, email, password, role } = await req.json()

    if (profile.role === 'manager' && role !== 'cashier') {
      return NextResponse.json({ error: 'Managers can only add cashiers' }, { status: 403 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role, store_id: profile.store_id }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ 
        id: authData.user.id, 
        full_name, 
        email, 
        role, 
        store_id: profile.store_id,
        active: true 
      })

    if (profileError) {
      console.error('Profile insert failed:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

	if (profileError) return NextResponse.json({ error: (profileError as any)?.message || 'Failed to create profile' }, { status: 400 })

    return NextResponse.json({ success: true, id: authData.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}