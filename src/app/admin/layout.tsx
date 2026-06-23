"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Building2,
  Users,
  Menu,
  Shield,
} from "lucide-react";

import { useAdminStore } from "@/store/admin-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const {
    sidebarCollapsed,
    toggleSidebar,
  } = useAdminStore();

  const navItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      label: "Stores",
      href: "/admin/stores",
      icon: Building2,
    },
    {
      label: "Owners",
      href: "/admin/owners",
      icon: Users,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">

<motion.aside
  initial={false}
  animate={{
    width: sidebarCollapsed ? 80 : 260,
  }}
  transition={{
    duration: 0.2,
  }}
  className="border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl"
>
  <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">

    {!sidebarCollapsed && (
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-cyan-400" />
        <span className="font-bold text-lg">
          SalesTrack Pro
        </span>
      </div>
    )}

    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="hover:bg-slate-800"
    >
      <Menu className="h-5 w-5" />
    </Button>

  </div>

  <nav className="p-3 space-y-1">

    {navItems.map((item) => {
      const active =
        pathname === item.href ||
        (
          item.href !== "/admin" &&
          pathname.startsWith(item.href)
        );

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-slate-800 hover:text-cyan-400",
            active &&
              "bg-slate-800 text-cyan-400"
          )}
        >
          <item.icon className="h-5 w-5 shrink-0" />

          {!sidebarCollapsed && (
            <span className="text-sm font-medium">
              {item.label}
            </span>
          )}
        </Link>
      );
    })}

  </nav>
</motion.aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}