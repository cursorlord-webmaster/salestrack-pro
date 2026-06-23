// src/app/(stores)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StoreLayoutClient from './layout-client';

export default async function StoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/client-login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, active, store_id, full_name, email')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.active) {
    redirect('/client-login');
  }

  if (profile.role === 'master_admin') {
    redirect('/login');
  }

  if (!profile.store_id) {
    redirect('/client-login');
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, status, license_expires_at')
    .eq('id', profile.store_id)
    .single();

  if (
    storeError ||
    !store ||
    store.status !== 'active' ||
    new Date(store.license_expires_at) < new Date()
  ) {
    redirect('/client-login');
  }

  return (
    <StoreLayoutClient profile={profile} store={store}>
      {children}
    </StoreLayoutClient>
  );
}