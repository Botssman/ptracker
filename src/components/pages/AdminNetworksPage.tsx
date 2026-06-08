"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Plus, Pencil, Trash2, Store } from "lucide-react";

interface NetworkData {
  id: number;
  name: string;
  createdAt: string;
}

export function AdminNetworksPage() {
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<NetworkData | null>(null);
  const [formName, setFormName] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingNetwork, setDeletingNetwork] = useState<NetworkData | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchNetworks = async () => {
    try {
      const data = await apiFetch<NetworkData[]>("/api/networks");
      setNetworks(data);
    } catch (err) {
      console.error("Failed to fetch networks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const openAddDialog = () => {
    setEditingNetwork(null);
    setFormName("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEditDialog = (network: NetworkData) => {
    setEditingNetwork(network);
    setFormName(network.name);
    setFormError("");
    setDialogOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Введите название сети");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      if (editingNetwork) {
        await apiFetch(`/api/networks/${editingNetwork.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: formName.trim() }),
        });
      } else {
        await apiFetch("/api/networks", {
          method: "POST",
          body: JSON.stringify({ name: formName.trim() }),
        });
      }

      setDialogOpen(false);
      fetchNetworks();
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          setFormError(parsed.error || "Ошибка сохранения");
        } catch {
          setFormError(err.message || "Ошибка сохранения");
        }
      } else {
        setFormError("Ошибка сохранения");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteDialog = (network: NetworkData) => {
    setDeletingNetwork(network);
    setDeleteError("");
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingNetwork) return;
    setDeleteLoading(true);
    setDeleteError("");

    try {
      await apiFetch(`/api/networks/${deletingNetwork.id}`, { method: "DELETE" });
      setDeleteDialogOpen(false);
      setDeletingNetwork(null);
      fetchNetworks();
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          setDeleteError(parsed.error || "Ошибка удаления");
        } catch {
          setDeleteError(err.message || "Ошибка удаления");
        }
      } else {
        setDeleteError("Ошибка удаления");
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Сети магазинов</h1>
        </div>
        <LoadingState type="table" count={5} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Сети магазинов</h1>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Добавить сеть
        </Button>
      </div>

      {networks.length === 0 ? (
        <EmptyState icon={Store} message="Сети магазинов не добавлены" />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {networks.map(network => (
                  <TableRow key={network.id}>
                    <TableCell className="font-mono text-xs">{network.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{network.name}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(network.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(network)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(network)}>
                          <Trash2 className="h-4 w-4" />
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
            {networks.map(network => (
              <Card key={network.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="text-sm mb-1">{network.name}</Badge>
                      <p className="text-xs text-muted-foreground">ID: {network.id} · Создана: {formatDate(network.createdAt)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(network)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteDialog(network)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingNetwork ? "Редактирование сети" : "Новая сеть"}</DialogTitle>
            <DialogDescription>
              {editingNetwork ? "Измените название сети магазинов" : "Введите название новой сети магазинов"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="network-name">Название</Label>
                <Input
                  id="network-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Например: Магнит"
                />
                {formError && (
                  <p className="text-sm text-destructive">{formError}</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удаление сети</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить сеть «{deletingNetwork?.name}»?
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{deleteError}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
