"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Trophy, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function AppShell({
  navItems,
  title,
  children,
}: {
  navItems: NavItem[];
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface-raised lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6 font-bold text-foreground">
          <Trophy className="h-5 w-5 text-gold" />
          {title}
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-overlay hover:text-foreground",
                  active && "bg-gold/10 text-gold",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 border-t border-border px-6 py-4 text-sm font-medium text-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-col border-b border-border lg:hidden">
          <div className="flex h-16 items-center justify-between px-6">
            <span className="flex items-center gap-2 font-bold text-foreground">
              <Trophy className="h-5 w-5 text-gold" /> {title}
            </span>
            <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="text-sm text-muted">
              Sign out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted",
                    active && "bg-gold/10 text-gold",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
