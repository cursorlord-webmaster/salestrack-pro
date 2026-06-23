"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">

      <Card className="w-full max-w-md bg-slate-900 border-slate-800">

        <CardContent className="p-8">

          <div className="text-center space-y-2 mb-8">

            <h1 className="text-3xl font-bold text-white">
              SalesTrack Pro
            </h1>

            <p className="text-slate-400">
              Admin Control Login
            </p>

          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
<Input
  type="email"
  placeholder="Email Address"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
/>

<Input
  type="password"
  placeholder="Password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
/>

            {error && (
              <div className="text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold"
            >
              {loading
                ? "Signing In..."
                : "Login"}
            </Button>

          </form>

        </CardContent>

      </Card>

    </div>
  );
}