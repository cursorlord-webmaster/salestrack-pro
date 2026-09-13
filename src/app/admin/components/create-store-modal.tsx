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
  const { createModalOpen, setCreateModalOpen } = useAdminStore();

  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseExpiresAt, setLicenseExpiresAt] = useState("");

  // Success state
  const [successData, setSuccessData] = useState<{
    storeId: string;
    onboardingLink: string;
    fullLink: string;
    localLink: string;
    ownerEmail: string;
    tempPassword: string;
    storeName: string;
  } | null>(null);

  const [copied, setCopied] = useState<string | null>(null);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSubmit() {
    try {
      setLoading(true);

      // Auto-default license to 1 year if not selected
      const finalLicense = licenseExpiresAt || new Date(Date.now() + 365*24*3600*1000).toISOString().split('T')[0];

      const response = await fetch("/api/admin/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          ownerName,
          ownerEmail,
          ownerPassword,
          phone,
          licenseExpiresAt: finalLicense,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Provision failed");
        return;
      }

      // Build local link for localhost testing
      const localLink = `http://localhost:3000${result.onboardingLink}`;

      setSuccessData({
        storeId: result.storeId,
        onboardingLink: result.onboardingLink,
        fullLink: result.fullLink,
        localLink,
        ownerEmail: result.ownerEmail || ownerEmail,
        tempPassword: ownerPassword, // We have it locally, show once
        storeName,
      });

      // Clear form
      setStoreName("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setPhone("");
      setLicenseExpiresAt("");

    } catch (err) {
      console.error(err);
      alert("Provisioning failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCloseSuccess() {
    setSuccessData(null);
    setCreateModalOpen(false);
    window.location.reload();
  }

  // If success, show the credential modal
  if (successData) {
    return (
      <Dialog open={true} onOpenChange={handleCloseSuccess}>
        <DialogContent className="sm:max-w-xl bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-center text-white">✅ Store Created: {successData.storeName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="bg-slate-800 p-3 rounded">
              <p className="text-slate-400">Store ID</p>
              <p className="text-white font-mono text-xs">{successData.storeId}</p>
            </div>

            <div className="bg-amber-950/30 border border-amber-800 p-3 rounded">
              <p className="text-amber-400 font-semibold">🔗 Onboarding Link (Send FIRST via WhatsApp)</p>
              
              {/* PRODUCTION - PRIMARY */}
              <p className="text-xs text-emerald-300 mt-3 font-semibold">✅ Production Link (Send to Customer)</p>
              <div className="flex gap-2 mt-1">
                <Input value={successData.fullLink} readOnly className="bg-slate-800 border-slate-700 text-white text-xs" />
                <Button onClick={() => copyToClipboard(successData.fullLink, 'prod-link')} className="bg-emerald-600 hover:bg-emerald-700">
                  {copied === 'prod-link' ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* LOCALHOST - SECONDARY */}
              <p className="text-xs text-slate-400 mt-3">🧪 Localhost Test (Dev only)</p>
              <div className="flex gap-2 mt-1">
                <Input value={successData.localLink} readOnly className="bg-slate-900 border-slate-700 text-slate-400 text-xs" />
                <Button variant="outline" onClick={() => copyToClipboard(successData.localLink, 'local-link')} className="border-slate-600 text-slate-300">
                  {copied === 'local-link' ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="bg-slate-800 p-3 rounded">
              <p className="text-slate-400">Owner Email</p>
              <div className="flex gap-2 mt-1">
                <Input value={successData.ownerEmail} readOnly className="bg-slate-900 border-slate-700 text-white" />
                <Button variant="outline" onClick={() => copyToClipboard(successData.ownerEmail, 'email')}>
                  {copied === 'email'? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="bg-red-950/30 border border-red-800 p-3 rounded">
              <p className="text-red-400 font-semibold">🔑 Temp Password (Send SECOND, after he accepts EULA)</p>
              <div className="flex gap-2 mt-1">
                <Input value={successData.tempPassword} readOnly className="bg-slate-900 border-slate-700 text-white font-mono" />
                <Button variant="destructive" onClick={() => copyToClipboard(successData.tempPassword, 'pass')}>
                  {copied === 'pass'? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text- text-red-300 mt-2">⚠️ This password is shown ONLY ONCE. Copy it now, save it securely. It is hashed in Supabase Auth, not stored in plain text.</p>
            </div>

            <div className="bg-slate-800 p-3 rounded text-slate-300">
              <p className="font-semibold text-white">WhatsApp Flow:</p>
              <p className="mt-1">1. Send onboarding link first</p>
              <p>2. Wait for client to say "I've accepted"</p>
              <p>3. Then send temp password separately</p>
            </div>

            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCloseSuccess}>
              Done & Refresh Stores List
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Create Store</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input placeholder="Store Name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <Input placeholder="Owner Full Name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
          <Input placeholder="Owner Email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
          <Input placeholder="Temporary Password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} />
          <Input placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input type="date" value={licenseExpiresAt} onChange={(e) => setLicenseExpiresAt(e.target.value)} />
          <p className="text- text-gray-500">Leave date empty = auto 1 year license. You can update later in Store Actions.</p>

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading? "Creating..." : "Create Store"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}