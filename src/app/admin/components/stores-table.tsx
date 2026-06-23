"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MoreVertical } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { StoreActionsModal } from "./store-actions-modal";

type Store = {
  id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  phone: string | null;
  status: string;
  license_expires_at: string;
  created_at: string;
};

export function StoresTable() {
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState("");

  const [selectedStore, setSelectedStore] =
    useState<Store | null>(null);

  const [actionModalOpen, setActionModalOpen] =
    useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  async function fetchStores() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setStores(data || []);
  }

  function openStoreActions(store: Store) {
    setSelectedStore(store);
    setActionModalOpen(true);
  }

  const filteredStores = stores.filter((store) =>
    [store.name, store.owner_name, store.owner_email]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">

      <Input
        placeholder="Search stores, owners or emails..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="bg-slate-800 border-slate-700 text-white"
      />

      <div className="rounded-lg border border-slate-800 overflow-hidden">

        <Table>

          <TableHeader>

            <TableRow className="border-slate-800">

              <TableHead className="w-[20%] text-slate-300 font-semibold">
                Store
              </TableHead>

              <TableHead className="w-[15%] text-slate-300 font-semibold text-center">
                Owner
              </TableHead>

              <TableHead className="w-[25%] text-slate-300 font-semibold text-center">
                Email
              </TableHead>

              <TableHead className="w-[10%] text-slate-300 font-semibold text-center">
                Status
              </TableHead>

              <TableHead className="w-[15%] text-slate-300 font-semibold text-center">
                License
              </TableHead>

              <TableHead className="w-[10%] text-slate-300 font-semibold text-center">
                Created
              </TableHead>

              <TableHead className="w-[5%] text-slate-300 font-semibold text-center">
                Action
              </TableHead>

            </TableRow>

          </TableHeader>

          <TableBody>

            {filteredStores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-slate-500 py-8"
                >
                  No stores found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStores.map((store) => {
                const isExpired =
                  new Date(store.license_expires_at) <
                  new Date();

                return (
                  <TableRow
                    key={store.id}
                    className="border-slate-800 hover:bg-slate-800/40"
                  >
                    <TableCell className="text-slate-100 font-medium">
                      {store.name}
                    </TableCell>

                    <TableCell className="text-slate-300 text-center">
                      {store.owner_name || "—"}
                    </TableCell>

                    <TableCell className="text-slate-300 text-center">
                      {store.owner_email || "—"}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={
                          store.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {store.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={
                          isExpired
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                        }
                      >
                        {format(
                          new Date(store.license_expires_at),
                          "MMM dd, yyyy"
                        )}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-slate-300 text-center">
                      {format(
                        new Date(store.created_at),
                        "MMM dd, yyyy"
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          openStoreActions(store)
                        }
                        className="h-8 w-8 hover:bg-slate-800"
                      >
                        <MoreVertical className="h-4 w-4 text-slate-400" />
                      </Button>
                    </TableCell>

                  </TableRow>
                );
              })
            )}

          </TableBody>

        </Table>

      </div>

      <StoreActionsModal
        store={selectedStore}
        open={actionModalOpen}
        onOpenChange={setActionModalOpen}
        onComplete={fetchStores}
      />

    </div>
  );
}