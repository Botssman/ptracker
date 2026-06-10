"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  Plus, Eye, Pencil, Trash2, FolderOpen, DollarSign,
  Clock, CheckCircle2, RotateCcw, AlertCircle
} from "lucide-react";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface GroupData {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  network: string;
  name: string;
  phone: string | null;
  period: string;
  status: string;
  discountCardPath: string | null;
  totalSum: number | null;
  totalItems: number;
  completedItems: number;
}

interface NetworkData {
  id: number;
  name: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активно",
  PENDING_REVIEW: "На проверке",
  COMPLETED: "Завершено",
};

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "ACTIVE") return "default";
  if (status === "PENDING_REVIEW") return "destructive";
  return "secondary";
}

export function AdminGroupsPage() {
  const { navigate } = useRouterContext();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>("all");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [groupsData, usersData, networksData] = await Promise.all([
          apiFetch<GroupData[]>("/api/groups"),
          apiFetch<UserData[]>("/api/users"),
          apiFetch<NetworkData[]>("/api/networks"),
        ]);
        setGroups(groupsData);
        setUsers(usersData);
        setNetworks(networksData);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить группу и все связанные данные (товары, чеки)?")) return;
    try {
      await apiFetch(`/api/groups/${id}`, { method: "DELETE" });
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось удалить группу";
      alert(msg);
    }
  };

  const handleQuickComplete = async (id: number) => {
    if (!confirm("Завершить эту группу?")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/api/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      setGroups(prev => prev.map(g => g.id === id ? { ...g, status: "COMPLETED" } : g));
    } catch (err) {
      alert("Не удалось завершить группу");
    } finally {
      setActionLoading(null);
    }
  };

  const handleQuickReturn = async (id: number) => {
    if (!confirm("Вернуть группу в активные?")) return;
    setActionLoading(id);
    try {
      await apiFetch(`/api/groups/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      setGroups(prev => prev.map(g => g.id === id ? { ...g, status: "ACTIVE" } : g));
    } catch (err) {
      alert("Не удалось вернуть группу");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Группы заданий</h1>
        </div>
        <LoadingState type="table" count={5} />
      </div>
    );
  }

  let filteredGroups = [...groups];

  if (userFilter !== "all") {
    filteredGroups = filteredGroups.filter(g => g.userId === Number(userFilter));
  }
  if (networkFilter !== "all") {
    filteredGroups = filteredGroups.filter(g => g.network === networkFilter);
  }
  if (statusFilter !== "all") {
    filteredGroups = filteredGroups.filter(g => g.status === statusFilter);
  }

  const networkNames = networks.map(n => n.name);
  const pendingGroups = groups.filter(g => g.status === "PENDING_REVIEW");
  const pendingCount = pendingGroups.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Группы заданий</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs px-2.5 py-0.5 animate-pulse">
              {pendingCount} на проверке
            </Badge>
          )}
        </div>
        <Button onClick={() => navigate("group-form")} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Создать группу
        </Button>
      </div>

      {/* ============ PENDING REVIEW SECTION ============ */}
      {pendingCount > 0 && (
        <Card className="mb-6 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Ожидают проверки
              <Badge variant="destructive" className="ml-1 text-xs">{pendingCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingGroups.map(group => {
              const progressPercent = group.totalItems > 0 ? (group.completedItems / group.totalItems) * 100 : 0;
              return (
                <div
                  key={group.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white rounded-lg border border-orange-100 shadow-sm"
                >
                  {/* Left: Group info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-xs">{group.network}</Badge>
                      <span className="text-xs text-muted-foreground">{group.period}</span>
                    </div>
                    <p className="font-medium text-sm truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {group.userName} · {group.userEmail}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {group.completedItems}/{group.totalItems} товаров
                        </p>
                        <Progress value={progressPercent} className="h-2 flex-1" />
                      </div>
                      {group.totalSum !== null && (
                        <span className="text-xs font-medium">
                          {Number(group.totalSum).toLocaleString("ru-RU")} ₽
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => navigate("group-detail", { id: group.id })}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Подробнее
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-green-600 hover:bg-green-700"
                      disabled={actionLoading === group.id}
                      onClick={() => handleQuickComplete(group.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      Завершить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      disabled={actionLoading === group.id}
                      onClick={() => handleQuickReturn(group.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Вернуть
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Пользователь" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Сеть" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сети</SelectItem>
                {networkNames.map(n => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="ACTIVE">Активно</SelectItem>
                <SelectItem value="PENDING_REVIEW">На проверке</SelectItem>
                <SelectItem value="COMPLETED">Завершено</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredGroups.length === 0 ? (
        <EmptyState icon={FolderOpen} message="Группы не найдены" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Сеть</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Прогресс</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map(group => {
                  const progressPercent = group.totalItems > 0 ? (group.completedItems / group.totalItems) * 100 : 0;
                  return (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono text-xs">{group.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{group.userName}</p>
                          <p className="text-xs text-muted-foreground">{group.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{group.network}</Badge></TableCell>
                      <TableCell className="max-w-[200px] truncate">{group.name}</TableCell>
                      <TableCell className="text-sm">{group.period}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(group.status)}>
                          {STATUS_LABELS[group.status] || group.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[120px]">
                          <p className="text-xs text-muted-foreground mb-1">{group.completedItems}/{group.totalItems} товаров</p>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {group.totalSum !== null ? (
                          <span className="text-sm font-medium">{Number(group.totalSum).toLocaleString("ru-RU")} ₽</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => navigate("group-detail", { id: group.id })}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate("group-form", { id: group.id })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(group.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filteredGroups.map(group => {
              const progressPercent = group.totalItems > 0 ? (group.completedItems / group.totalItems) * 100 : 0;
              return (
                <Card key={group.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="outline" className="text-xs mb-1">{group.network}</Badge>
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.userName} · {group.period}</p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(group.status)} className="text-xs">
                        {STATUS_LABELS[group.status] || group.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-muted-foreground">{group.completedItems}/{group.totalItems} товаров</p>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                    {group.totalSum !== null && (
                      <div className="flex items-center gap-1 mb-3">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{Number(group.totalSum).toLocaleString("ru-RU")} ₽</span>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("group-detail", { id: group.id })}>
                        <Eye className="h-3 w-3 mr-1" />
                        Просмотр
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate("group-form", { id: group.id })}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Изменить
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(group.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Удалить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
