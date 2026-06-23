"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plus,
  Store,
  Users,
  AlertCircle,
  Search,
  MoreVertical,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAdminStore } from "@/store/admin-store";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CreateStoreModal } from "./components/create-store-modal";
import { StoreActionsModal } from "./components/store-actions-modal";

type StoreRecord = {
  id: string;
  name: string;
  owner_email: string;
  owner_phone: string | null;
  status: string;
  license_expires_at: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const { setCreateModalOpen } = useAdminStore();

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expiring: 0,
  });

  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedStore, setSelectedStore] =
    useState<StoreRecord | null>(null);

  const [actionModalOpen, setActionModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function fetchDashboardData() {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return;

    const now = new Date();
    const sevenDays = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    setStats({
      total: data.length,
      active: data.filter(
        (s) =>
          s.status === "active" &&
          new Date(s.license_expires_at) > now
      ).length,
      expiring: data.filter((s) => {
        const exp = new Date(s.license_expires_at);

        return (
          s.status === "active" &&
          exp > now &&
          exp < sevenDays
        );
      }).length,
    });

    setStores(data);
  }

  const filteredStores = stores.filter((store) =>
    store.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  function openStoreActions(store: StoreRecord) {
    setSelectedStore(store);
    setActionModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 space-y-6 md:space-y-8">

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

      {/* Header */}
      <div className="text-center space-y-4">

        <h1 className="text-2xl md:text-4xl font-bold text-white">
          SalesTrack Pro
        </h1>

        <p className="text-slate-400 text-sm md:text-base">
          Admin Control Panel
        </p>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold"
        >
          
          Add Store
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <Card className="bg-slate-900 border-slate-800 text-center">
          <CardHeader>
            <Store className="mx-auto h-5 w-5 text-cyan-400" />
            <CardTitle className="text-slate-300 text-sm">
              Total Stores
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-center">
          <CardHeader>
            <Users className="mx-auto h-5 w-5 text-emerald-400" />
            <CardTitle className="text-slate-300 text-sm">
              Active Licenses
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-center">
          <CardHeader>
            <AlertCircle className="mx-auto h-5 w-5 text-amber-400" />
            <CardTitle className="text-slate-300 text-sm">
              Expiring Soon
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.expiring}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stores */}
      <Card className="bg-slate-900 border-slate-800">

        <CardHeader className="space-y-4">

          <CardTitle className="text-center text-white">
            Stores
          </CardTitle>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

            <Input
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>

        </CardHeader>

        <CardContent>

{/* Desktop Table */}
<div className="hidden md:block">

<Table>
  <TableHeader>
    <TableRow className="border-slate-800">
      <TableHead className="w-[35%] text-slate-300 font-semibold">
        Store
      </TableHead>

      <TableHead className="w-[15%] text-slate-300 font-semibold text-center">
        Status
      </TableHead>

      <TableHead className="w-[20%] text-slate-300 font-semibold text-center">
        License
      </TableHead>

      <TableHead className="w-[20%] text-slate-300 font-semibold text-center">
        Created
      </TableHead>

      <TableHead className="w-[10%] text-slate-300 font-semibold text-center">
        Action
      </TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    {filteredStores.map((store) => (
      <TableRow
        key={store.id}
        className="border-slate-800 hover:bg-slate-800/40"
      >
        <TableCell className="text-slate-100 font-medium">
          {store.name}
        </TableCell>

        <TableCell className="text-center">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {store.status}
          </Badge>
        </TableCell>

        <TableCell className="text-slate-300 text-center">
          {format(
            new Date(store.license_expires_at),
            "MMM dd, yyyy"
          )}
        </TableCell>

        <TableCell className="text-slate-300 text-center">
          {format(
            new Date(store.created_at),
            "MMM dd, yyyy"
          )}
        </TableCell>

        <TableCell className="text-center">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => openStoreActions(store)}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

</div>

          {/* Mobile Cards */}

          <div className="md:hidden space-y-3">

            {filteredStores.map((store) => (
              <Card
                key={store.id}
                className="bg-slate-800 border-slate-700"
              >
                <CardContent className="p-4 space-y-3">

                  <div className="text-center">
                    <div className="font-semibold text-white">
                      {store.name}
                    </div>
                  </div>

                  <div className="text-sm text-slate-400 text-center">
                    Expires:
                    {" "}
                    {format(
                      new Date(store.license_expires_at),
                      "MMM dd, yyyy"
                    )}
                  </div>

                  <div className="flex justify-center">
                    <Badge>
                      {store.status}
                    </Badge>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      openStoreActions(store)
                    }
                  >
                    Manage Store
                  </Button>

                </CardContent>
              </Card>
            ))}

          </div>

          {filteredStores.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              No stores found.
            </div>
          )}

<div className="text-center mt-6 text-slate-500 text-sm">
  Store management module coming next
</div>

        </CardContent>
      </Card>

      <CreateStoreModal />

      <StoreActionsModal
        store={selectedStore}
        open={actionModalOpen}
        onOpenChange={setActionModalOpen}
        onComplete={fetchDashboardData}
      />

    </div>
  );
}