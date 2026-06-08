"use client";

import type { UserRole } from "@/lib/mock-data";
import { AppHeader, GuestHeader } from "./AppHeader";

interface AppLayoutProps {
  role: UserRole | "guest";
  onLogout: () => void;
  onLogin: () => void;
  onInvite: () => void;
  children: React.ReactNode;
}

export function AppLayout({ role, onLogout, onLogin, onInvite, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {role === "guest" ? (
        <GuestHeader onLogin={onLogin} onInvite={onInvite} />
      ) : (
        <AppHeader role={role} onLogout={onLogout} />
      )}
      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </div>
      </main>
      <footer className="border-t bg-card py-4 mt-auto">
        <div className="container mx-auto px-4 max-w-7xl text-center text-sm text-muted-foreground">
          Purchase Tracker © 2025
        </div>
      </footer>
    </div>
  );
}
