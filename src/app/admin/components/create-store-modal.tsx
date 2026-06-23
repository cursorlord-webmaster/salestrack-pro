"use client";

import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateStoreModal() {
  const { createModalOpen, setCreateModalOpen } =
    useAdminStore();

  const [loading, setLoading] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] =
    useState("");

  async function handleSubmit() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/provision",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            storeName,
            ownerName,
            ownerEmail,
            ownerPassword,
            phone,
            licenseExpiresAt,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Provision failed");
        return;
      }

      alert("Store created successfully");

      setCreateModalOpen(false);

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Provisioning failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={createModalOpen}
      onOpenChange={setCreateModalOpen}
    >
      <DialogContent className="sm:max-w-lg">

        <DialogHeader>
          <DialogTitle className="text-center">
            Create Store
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">

          <Input
            placeholder="Store Name"
            value={storeName}
            onChange={(e) =>
              setStoreName(e.target.value)
            }
          />

          <Input
            placeholder="Owner Full Name"
            value={ownerName}
            onChange={(e) =>
              setOwnerName(e.target.value)
            }
          />

          <Input
            placeholder="Owner Email"
            value={ownerEmail}
            onChange={(e) =>
              setOwnerEmail(e.target.value)
            }
          />

          <Input
            placeholder="Temporary Password"
            value={ownerPassword}
            onChange={(e) =>
              setOwnerPassword(e.target.value)
            }
          />

          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
          />

          <Input
            type="date"
            value={licenseExpiresAt}
            onChange={(e) =>
              setLicenseExpiresAt(e.target.value)
            }
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Store"}
          </Button>

        </div>

      </DialogContent>
    </Dialog>
  );
}