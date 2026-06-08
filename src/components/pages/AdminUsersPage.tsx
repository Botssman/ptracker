"use client";

import { useState } from "react";
import { users } from "@/lib/mock-data";
import type { UserRole } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDemoState } from "@/app/page";
import { Users, Pencil, ShieldAlert } from "lucide-react";

const roleBadgeVariant: Record<UserRole, "default" | "secondary" | "outline"> = {
  admin: "default",
  moderator: "secondary",
  user: "outline",
};

const roleLabel: Record<UserRole, string> = {
  admin: "Админ",
  moderator: "Модератор",
  user: "Пользователь",
};

export function AdminUsersPage() {
  const { demoState } = useDemoState();
  const [editUser, setEditUser] = useState<typeof users[0] | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("user");
  const [dialogOpen, setDialogOpen] = useState(false);

  if (demoState === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Пользователи</h1>
        <LoadingState type="table" count={4} />
      </div>
    );
  }

  const displayUsers = demoState === "empty" ? [] : users;

  const openEdit = (user: typeof users[0]) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setDialogOpen(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Пользователи</h1>

      {displayUsers.length === 0 ? (
        <EmptyState icon={Users} message="Нет пользователей" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Дата регистрации</TableHead>
                  <TableHead className="text-center">Кол-во групп</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[user.role]}>{roleLabel[user.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{user.registeredAt}</TableCell>
                    <TableCell className="text-center">{user.groupsCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <ShieldAlert className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {displayUsers.map(user => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant={roleBadgeVariant[user.role]} className="text-xs">{roleLabel[user.role]}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Групп: {user.groupsCount} · {user.registeredAt}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование пользователя</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Имя</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Роль</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="moderator">Модератор</SelectItem>
                    <SelectItem value="admin">Админ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setDialogOpen(false)}>Сохранить</Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
