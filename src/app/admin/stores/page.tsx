"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { StoresTable } from "../components/stores-table";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StoresPage() {
	const router = useRouter();
const supabase = createClient();

async function handleLogout() {
  await supabase.auth.signOut();
  router.push("/login");
}
  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
	
	{/* Logout */}
<div className="flex justify-center md:justify-end">
  <Button
    variant="outline"
    size="sm"
    onClick={handleLogout}
    className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
  >
    Logout
  </Button>
</div>

      <div className="max-w-7xl mx-auto space-y-6">

<div className="text-center space-y-2">

  <h1 className="text-3xl md:text-4xl font-bold text-white">
    All Stores
  </h1>

  <p className="text-slate-400">
    Manage Provisioned Stores
  </p>

</div>

        <Card className="bg-slate-900 border-slate-800">

          <CardHeader>
            <CardTitle className="text-center text-white">
              Stores Registry
            </CardTitle>
          </CardHeader>

          <CardContent>
            <StoresTable />
          </CardContent>

        </Card>

      </div>

    </div>
  );
}