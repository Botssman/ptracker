"use client";

import { useRouterContext, type PageName } from "@/lib/router-context";
import { useAuth, type UserRole } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, ShoppingCart, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  page: PageName;
  showBadge?: boolean; // if true, show pending review count badge
}

const navItemsByRole: Record<UserRole, NavItem[]> = {
  USER: [
    { label: "Мои группы", page: "groups" },
  ],
  MODERATOR: [
    { label: "Группы заданий", page: "admin-groups", showBadge: true },
    { label: "Товары", page: "admin-products" },
  ],
  ADMIN: [
    { label: "Группы заданий", page: "admin-groups", showBadge: true },
    { label: "Товары", page: "admin-products" },
    { label: "Сети магазинов", page: "admin-networks" },
    { label: "Пользователи", page: "admin-users" },
    { label: "Коды приглашения", page: "invite-codes" },
    { label: "Статистика", page: "stats" },
  ],
};

interface AppHeaderProps {
  role: UserRole;
  onLogout: () => void;
  userName?: string;
}

export function AppHeader({ role, onLogout, userName }: AppHeaderProps) {
  const { currentPage, navigate } = useRouterContext();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const items = navItemsByRole[role] || navItemsByRole.USER;

  // Fetch pending review count for admin/moderator
  useEffect(() => {
    if (role !== "ADMIN" && role !== "MODERATOR") return;

    async function fetchPendingCount() {
      try {
        const data = await apiFetch<{ id: number; status: string }[]>("/api/groups?status=PENDING_REVIEW");
        setPendingCount(data.length);
      } catch {
        // silently fail
      }
    }

    fetchPendingCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const handleNav = (page: PageName) => {
    navigate(page);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-14 items-center px-4 max-w-7xl">
        <div className="flex items-center gap-2 mr-6">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg text-primary hidden sm:inline">Purchase Tracker</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {items.map((item) => (
            <Button
              key={item.page}
              variant={currentPage === item.page ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleNav(item.page)}
              className="text-sm relative"
            >
              {item.label}
              {item.showBadge && pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          {userName && (
            <span className="text-sm text-muted-foreground">{userName}</span>
          )}
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" />
            Выйти
          </Button>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden ml-auto">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Menu className="h-5 w-5" />
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="text-lg font-bold mb-4">Меню</SheetTitle>
              {userName && (
                <p className="text-sm text-muted-foreground mb-3">{userName}</p>
              )}
              <nav className="flex flex-col gap-1">
                {items.map((item) => (
                  <Button
                    key={item.page}
                    variant={currentPage === item.page ? "secondary" : "ghost"}
                    className="justify-start relative"
                    onClick={() => handleNav(item.page)}
                  >
                    {item.label}
                    {item.showBadge && pendingCount > 0 && (
                      <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center">
                        {pendingCount}
                      </Badge>
                    )}
                  </Button>
                ))}
                <div className="border-t my-2" />
                <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => { onLogout(); setOpen(false); }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

interface GuestHeaderProps {
  onLogin: () => void;
  onInvite: () => void;
}

export function GuestHeader({ onLogin, onInvite }: GuestHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-14 items-center px-4 max-w-7xl">
        <div className="flex items-center gap-2 mr-6">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg text-primary hidden sm:inline">Purchase Tracker</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={onInvite}>
            Войти по коду
          </Button>
          <Button size="sm" onClick={onLogin}>
            Войти
          </Button>
        </div>
      </div>
    </header>
  );
}
