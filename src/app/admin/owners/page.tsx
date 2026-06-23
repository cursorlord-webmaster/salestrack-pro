"use client";

import { useEffect, useState } from "react";
import { Search, MoreVertical, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

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

import { StoreActionsModal } from "../components/store-actions-modal";

type Owner = {
  id: string;
  full_name: string;
  email: string;
  store_id: string;
  store_name: string;
  status: string;
  license_expires_at: string;
  active: boolean;
};

export default function OwnersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedStore, setSelectedStore] =
    useState<any>(null);

  const [actionModalOpen, setActionModalOpen] =
    useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwners();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function fetchOwners() {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        active,
        store_id,
        stores (
          id,
          name,
          status,
          license_expires_at
        )
      `)
      .eq("role", "store_owner")
      .order("full_name", {
        ascending: true,
      });

    if (!error && data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        active: row.active,
        store_id: row.store_id,
        store_name: row.stores?.name || "—",
        status: row.stores?.status || "inactive",
        license_expires_at:
          row.stores?.license_expires_at,
      }));

      setOwners(mapped);
    }

    setLoading(false);
  }

  const filteredOwners = owners.filter((owner) =>
    [
      owner.full_name,
      owner.email,
      owner.store_name,
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  function openActionModal(owner: Owner) {
    setSelectedStore({
      id: owner.store_id,
      name: owner.store_name,
      owner_email: owner.email,
      status: owner.status,
      license_expires_at:
        owner.license_expires_at,
    });

    setActionModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 space-y-6">

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
      <div className="text-center space-y-2">

        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Store Owners
        </h1>

        <p className="text-slate-400">
          Manage Store Owners
        </p>

      </div>

      {/* Count Card */}
      <Card className="bg-slate-900 border-slate-800 max-w-sm mx-auto">

        <CardContent className="py-4">

          <div className="text-center">

            <div className="text-2xl font-bold text-white">
              {filteredOwners.length}
            </div>

            <div className="text-sm text-slate-400">
              {filteredOwners.length === 1
                ? "Owner"
                : "Owners"}
            </div>

          </div>

        </CardContent>

      </Card>

      {/* Table Card */}
      <Card className="bg-slate-900 border-slate-800">

        <CardHeader className="space-y-4">

          <CardTitle className="text-center text-white">
            Owners Registry
          </CardTitle>

          <div className="relative">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />

            <Input
              placeholder="Search owners, emails or stores..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />

          </div>

        </CardHeader>

        <CardContent>

          {loading ? (
            <div className="text-center py-10 text-slate-500">
              Loading owners...
            </div>
          ) : (
            <Table>

              <TableHeader>

                <TableRow className="border-slate-800">

                  <TableHead className="w-[25%] text-slate-300 font-semibold">
                    Owner
                  </TableHead>

                  <TableHead className="w-[25%] text-slate-300 font-semibold text-center">
                    Email
                  </TableHead>

                  <TableHead className="w-[20%] text-slate-300 font-semibold text-center">
                    Store
                  </TableHead>

                  <TableHead className="w-[10%] text-slate-300 font-semibold text-center">
                    Status
                  </TableHead>

                  <TableHead className="w-[15%] text-slate-300 font-semibold text-center">
                    License
                  </TableHead>

                  <TableHead className="w-[5%] text-slate-300 font-semibold text-center">
                    Action
                  </TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {filteredOwners.map((owner) => (
                  <TableRow
                    key={owner.id}
                    className="border-slate-800 hover:bg-slate-800/40"
                  >
                    <TableCell className="text-slate-100 font-medium">
                      {owner.full_name}
                    </TableCell>

                    <TableCell className="text-slate-300 text-center">
                      {owner.email}
                    </TableCell>

                    <TableCell className="text-slate-300 text-center">
                      {owner.store_name}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={
                          owner.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {owner.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-slate-300 text-center">
                      {owner.license_expires_at
                        ? new Date(
                            owner.license_expires_at
                          ).toLocaleDateString()
                        : "—"}
                    </TableCell>

                    <TableCell className="text-center">

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          openActionModal(owner)
                        }
                        className="hover:bg-slate-800"
                      >
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>

                    </TableCell>

                  </TableRow>
                ))}

                {filteredOwners.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-slate-500 py-8"
                    >
                      No owners found.
                    </TableCell>
                  </TableRow>
                )}

              </TableBody>

            </Table>
          )}

        </CardContent>

      </Card>

      <StoreActionsModal
        store={selectedStore}
        open={actionModalOpen}
        onOpenChange={setActionModalOpen}
        onComplete={fetchOwners}
      />

    </div>
  );
}