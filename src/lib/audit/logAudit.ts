import { createClient } from '@/lib/supabase/client'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'STORE_PROVISIONED' | 'SALE'

export async function logAudit(
  action: AuditAction,
  details: string,
  entity: string
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase
   .from('profiles')
   .select('store_id, full_name')
   .eq('id', user.id)
   .single()

  if (!profile?.store_id) return

  const { error } = await supabase.from('audit_logs').insert({
    store_id: profile.store_id,
    user_id: user.id,
    user_full_name: profile.full_name,
    action,
    entity,
    details,
    created_at: new Date().toISOString()
  })

  if (error) console.error('Audit log failed:', error)
}