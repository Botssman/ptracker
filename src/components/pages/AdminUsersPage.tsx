"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
import { Users, Pencil, ShieldAlert, KeyRound, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  groupsCount: number;
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  MODERATOR: "secondary",
  USER: "outline",
};

const roleLabel: Record<string, string> = {
  ADMIN: "Админ",
  MODERATOR: "Модератор",
  USER: "Пользователь",
};

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<string>("USER");
  const [editBlocked, setEditBlocked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    async function fetchUsers() {
      try {
        const data = await apiFetch<UserData[]>("/api/users");
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const refreshUsers = async () => {
    const data = await apiFetch<UserData[]>("/api/users");
    setUsers(data);
  };

  const openEdit = (user: UserData) => {
    setEditUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditBlocked(user.isBlocked);
    setNewPassword("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await apiFetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          role: editRole,
          isBlocked: editBlocked,
        }),
      });
      await refreshUsers();
      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to update user:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserData) => {
    setDeleting(user.id);
    try {
      await apiFetch(`/api/users/${user.id}`, { method: "DELETE" });
      await refreshUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleBlock = async (user: UserData) => {
    try {
      await apiFetch(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ isBlocked: !user.isBlocked }),
      });
      await refreshUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Пользователи</h1>
        <LoadingState type="table" count={4} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Пользователи</h1>

      {users.length === 0 ? (
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
                  <TableHead className="text-center">Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => {
                  const isSelf = user.id === Number(currentUser?.id);
                  return (
                    <TableRow key={user.id} className={user.isBlocked ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {user.name}
                        {isSelf && <span className="text-xs text-muted-foreground ml-1">(вы)</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[user.role] || "outline"}>{roleLabel[user.role] || user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(user.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                      <TableCell className="text-center">{user.groupsCount}</TableCell>
                      <TableCell className="text-center">
                        {user.isBlocked ? (
                          <Badge variant="destructive" className="text-xs">Заблокирован</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-green-600">Активен</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)} title="Редактировать">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={user.isBlocked ? "text-green-600" : "text-destructive"}
                            onClick={() => handleBlock(user)}
                            title={user.isBlocked ? "Разблокировать" : "Заблокировать"}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                          {isAdmin && !isSelf && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive" disabled={deleting === user.id} title="Удалить навсегда">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Пользователь <strong>{user.name}</strong> ({user.email}) будет удалён навсегда.
                                    Все его группы закупок, элементы и чеки также будут удалены. Это действие нельзя отменить.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => handleDelete(user)}>
                                    Удалить
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {users.map(user => {
              const isSelf = user.id === Number(currentUser?.id);
              return (
                <Card key={user.id} className={user.isBlocked ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {user.name}
                          {isSelf && <span className="text-xs text-muted-foreground ml-1">(вы)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={roleBadgeVariant[user.role] || "outline"} className="text-xs">{roleLabel[user.role] || user.role}</Badge>
                        {user.isBlocked && <Badge variant="destructive" className="text-xs">Блок</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Групп: {user.groupsCount} · {new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)} title="Редактировать">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleBlock(user)} title={user.isBlocked ? "Разблокировать" : "Заблокировать"}>
                          <ShieldAlert className="h-3 w-3" />
                        </Button>
                        {isAdmin && !isSelf && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={deleting === user.id} title="Удалить навсегда">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Пользователь <strong>{user.name}</strong> будет удалён навсегда вместе со всеми его группами и чеками.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => handleDelete(user)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Пользователь</SelectItem>
                    <SelectItem value="MODERATOR">Модератор</SelectItem>
                    <SelectItem value="ADMIN">Админ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-blocked"
                  checked={editBlocked}
                  onChange={(e) => setEditBlocked(e.target.checked)}
                  className="rounded border"
                />
                <Label htmlFor="edit-blocked" className="cursor-pointer">Заблокирован</Label>
              </div>
              <div className="space-y-2 border-t pt-4 mt-2">
                <Label className="text-muted-foreground text-xs">Смена пароля</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Новый пароль (мин. 6 символов)"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={changingPassword || newPassword.length < 6}
                    onClick={async () => {
                      if (!editUser || newPassword.length < 6) return;
                      setChangingPassword(true);
                      try {
                        await apiFetch(`/api/users/${editUser.id}`, {
                          method: "PUT",
                          body: JSON.stringify({ newPassword }),
                        });
                        setNewPassword("");
                      } catch (err) {
                        console.error("Failed to change password:", err);
                      } finally {
                        setChangingPassword(false);
                      }
                    }}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    {changingPassword ? "..." : "Сменить"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
