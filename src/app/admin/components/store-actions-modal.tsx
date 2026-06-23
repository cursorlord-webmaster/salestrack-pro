"use client";

import { useState } from "react";
import { format } from "date-fns";

import { createClient } from "@/lib/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StoreActionsModalProps = {
  store: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
};

export function StoreActionsModal({
  store,
  open,
  onOpenChange,
  onComplete,
}: StoreActionsModalProps) {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);

  const [licenseDate, setLicenseDate] = useState(
    store?.license_expires_at
      ? new Date(store.license_expires_at)
          .toISOString()
          .split("T")[0]
      : ""
  );

  async function updateStatus(
    status: "active" | "inactive"
  ) {
    if (!store) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("stores")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);

      if (error) throw error;

      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function updateLicense() {
    if (!store || !licenseDate) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("stores")
        .update({
          license_expires_at: licenseDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", store.id);

      if (error) throw error;

      onComplete?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update license");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800">

        <DialogHeader>
          <DialogTitle className="text-center text-white">
            Store Actions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {store?.name || "No Store Selected"}
            </h3>

            {store?.license_expires_at && (
              <p className="text-sm text-slate-400">
                Current Expiry:
                {" "}
                {format(
                  new Date(store.license_expires_at),
                  "MMM dd, yyyy"
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">

            <label className="text-sm text-slate-300">
              License Expiry Date
            </label>

            <Input
              type="date"
              value={licenseDate}
              onChange={(e) =>
                setLicenseDate(e.target.value)
              }
              className="bg-slate-800 border-slate-700 text-white"
            />

            <Button
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950"
              onClick={updateLicense}
              disabled={loading}
            >
              Update License
            </Button>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <Button
              onClick={() =>
                updateStatus("active")
              }
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Activate
            </Button>

            <Button
              onClick={() =>
                updateStatus("inactive")
              }
              disabled={loading}
              variant="destructive"
            >
              Deactivate
            </Button>

          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}