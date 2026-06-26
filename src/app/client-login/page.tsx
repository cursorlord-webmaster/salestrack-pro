// src/app/(stores)/client-login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Store, ArrowLeft, Eye, EyeOff } from 'lucide-react';


export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError('Login failed');
      setLoading(false);
      return;
    }

    // 2. Get profile + role + store info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, active, store_id, full_name')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      setError('Profile not found. Contact admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!profile.active) {
      setError('Account is deactivated. Contact admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 3. Master admin should use /login, not /client-login
    if (profile.role === 'master_admin') {
      setError('Admin users must use the admin login.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 4. Tenant users must have a store_id
    if (!profile.store_id) {
      setError('No store assigned to this account.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 5. Check store status + license
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('status, license_expires_at')
      .eq('id', profile.store_id)
      .single();

    if (storeError || !store) {
      setError('Store not found. Contact admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (store.status !== 'active') {
      setError('Store is not active. Contact admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (new Date(store.license_expires_at) < new Date()) {
      setError('Store license has expired. Contact admin.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // 6. Log audit BEFORE redirect - use direct insert
    try {
      const { error: auditError } = await supabase.from('audit_logs').insert({
        store_id: profile.store_id,
        user_id: profile.id,
        user_full_name: profile.full_name,
        action: 'LOGIN',
        entity: 'auth',
        details: 'User logged in',
        created_at: new Date().toISOString()
      })
      
      if (auditError) console.error('Login audit failed:', auditError)
    } catch (e) {
      console.error('Login audit error:', e)
    }

    // 7. All tenant roles land on POS first
    switch (profile.role) {
      case 'store_owner':
      case 'manager':
      case 'cashier':
        router.push('/pos');
        break;
      default:
        setError('Invalid role. Contact admin.');
        await supabase.auth.signOut();
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] p-4">
      <Card className="w-full max-w-sm bg-white shadow-xl overflow-visible">
<CardHeader className="pb-2 pt-6">
  <div className="flex flex-col items-center gap-0">
    <img 
      src="/logo.png" 
      alt="SalesTrack Pro Logo" 
      width={120} 
      height={120} 
      className="object-contain animate-pulse -mb-1"
    />
    
    <div className="text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-[#1e3a8a] leading-none">
        SalesTrack Pro
      </h1>
      <p className="text-base font-bold text-gray-700 leading-none mt-0.5">
        Client Authorized Login
      </p>
    </div>
  </div>
</CardHeader>
        
        <CardContent className="pt-2">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label 
                htmlFor="email" 
                className="block text-center text-sm font-semibold text-gray-700"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your account email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 text-center placeholder:text-center"
              />
            </div>

            <div className="space-y-1.5">
              <Label 
                htmlFor="password" 
                className="block text-center text-sm font-semibold text-gray-700"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 text-center placeholder:text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            {error && (
              <p className="text-center text-sm font-medium text-red-500">
                {error}
              </p>
            )}
            
<div className="flex justify-center">
  <Button 
    type="submit" 
    className="h-11 w-40 bg-[#1e3a8a] text-center font-semibold hover:bg-[#1e3a8a]/90" 
    disabled={loading}
  >
    {loading ? 'Signing in...' : 'Log Into Store'}
  </Button>
</div>
			
			{/* Divider */}
<div className="my-2 flex items-center text-center text-sm text-gray-500">
  <div className="flex-1 border-b border-gray-200" />
  <span className="px-4 font-medium">Secure Store Access</span>
  <div className="flex-1 border-b border-gray-200" />
</div>

{/* Footer text */}
<p className="text-center text-sm text-gray-600">
  Need help?{' '}
  <a
    href="mailto:contact@cursorlordsystems.com"
    className="font-semibold text-[#1e3a8a] transition-colors hover:text-[#1e3a8a]/80"
  >
    Contact Support
  </a>
</p>
          </form>
        </CardContent>
      </Card>

      {/* Back to Homepage Button - centered under form */}
      <div className="mt-6">
        <Link href="/homepage">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}