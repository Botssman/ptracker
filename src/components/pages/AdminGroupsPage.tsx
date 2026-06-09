"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Plus, Eye, Pencil, Trash2, FolderOpen } from "lucide-react";

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
  totalItems: number;
  completedItems: number;
}

interface NetworkData {
  id: number;
  name: string;
  createdAt: string;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Группы заданий</h1>
        <Button onClick={() => navigate("group-form")} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Создать группу
        </Button>
      </div>

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
                        <Badge variant={group.status === "ACTIVE" ? "default" : "secondary"}>
                          {group.status === "ACTIVE" ? "Активно" : "Завершено"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[120px]">
                          <p className="text-xs text-muted-foreground mb-1">{group.completedItems}/{group.totalItems} товаров</p>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
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
                      <Badge variant={group.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {group.status === "ACTIVE" ? "Активно" : "Завершено"}
                      </Badge>
                    </div>
                    <div className="space-y-1 mb-3">
                      <p className="text-xs text-muted-foreground">{group.completedItems}/{group.totalItems} товаров</p>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
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
