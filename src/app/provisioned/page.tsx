import { adminClient } from '@/lib/supabase/admin'
import ProvisionedClient from './provisioned-client'

export default async function ProvisionedPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600">Invalid Link</h1>
          <p className="mt-2 text-gray-600">No activation token found. Token missing in URL.</p>
          <p className="mt-2 text-xs text-gray-400">Debug: searchParams empty</p>
        </div>
      </div>
    )
  }

  const { data: tokenRow, error } = await adminClient
    .from('onboarding_tokens')
    .select('id, store_id, owner_email, expires_at, used_at, has_accepted_eula, stores(name)')
    .eq('token', token)
    .single()

  if (error || !tokenRow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600">Link Not Found</h1>
          <p className="mt-2 text-gray-600">Token {token} not found. Error: {error?.message}</p>
        </div>
      </div>
    )
  }

  if (tokenRow.used_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-amber-600">Already Activated</h1>
          <p className="mt-2 text-gray-600">This store was already activated.</p>
          <a href="/client-login" className="mt-4 inline-block bg-black text-white px-6 py-2 rounded">
            Go to Store Login
          </a>
        </div>
      </div>
    )
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-xl shadow max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600">Link Expired</h1>
          <p className="mt-2 text-gray-600">Expired: {tokenRow.expires_at}</p>
        </div>
      </div>
    )
  }

  const storeName = (tokenRow as any).stores?.name || 'Your Store'

  return (
    <ProvisionedClient
      token={token}
      tokenId={tokenRow.id}
      storeId={tokenRow.store_id}
      storeName={storeName}
      ownerEmail={tokenRow.owner_email}
    />
  )
}