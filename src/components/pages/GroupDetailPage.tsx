"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiUpload } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  ArrowLeft, CreditCard, Phone, ExternalLink, ShoppingCart,
  Upload, Image as ImageIcon, PackageOpen, FileText, CheckCircle2, Clock, XCircle, Trash2
} from "lucide-react";

interface ItemData {
  id: number;
  productId: number;
  assignedQty: number;
  purchasedQty: number;
  userMarkedQty: number;
  modConfirmed: boolean;
  product: {
    id: number;
    brand: string;
    nomenclature: string;
    link: string | null;
    thumbnailPath: string | null;
  };
}

interface ReceiptData {
  id: number;
  filePath: string;
  originalName: string | null;
  uploadedAt: string;
}

interface GroupDetail {
  id: number;
  userId: number;
  network: string;
  name: string;
  phone: string | null;
  period: string;
  status: string;
  discountCardPath: string | null;
  user: { name: string; email: string };
  items: ItemData[];
  receipts: ReceiptData[];
}

export function GroupDetailPage() {
  const { routeParams, navigate } = useRouterContext();
  const { user } = useAuth();
  const groupId = Number(routeParams.id) || 0;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseState, setPurchaseState] = useState<Record<number, number>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const data = await apiFetch<GroupDetail>(`/api/groups/${groupId}`);
        setGroup(data);
        // Initialize purchase state from data
        const state: Record<number, number> = {};
        data.items.forEach(item => {
          state[item.id] = item.purchasedQty;
        });
        setPurchaseState(state);
      } catch (err) {
        console.error("Failed to fetch group:", err);
      } finally {
        setLoading(false);
      }
    }
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  const handlePurchaseChange = async (itemId: number, qty: number) => {
    setPurchaseState(prev => ({ ...prev, [itemId]: qty }));
    try {
      await apiFetch(`/api/groups/${groupId}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ purchasedQty: qty, userMarkedQty: qty }),
      });
    } catch (err) {
      console.error("Failed to update purchase qty:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      await apiUpload(`/api/groups/${groupId}/receipts`, formData);
      // Refresh group data
      const data = await apiFetch<GroupDetail>(`/api/groups/${groupId}`);
      setGroup(data);
    } catch (err) {
      console.error("Failed to upload receipts:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: number) => {
    try {
      await apiFetch(`/api/receipts/${receiptId}`, { method: "DELETE" });
      // Refresh group data
      const data = await apiFetch<GroupDetail>(`/api/groups/${groupId}`);
      setGroup(data);
    } catch (err) {
      console.error("Failed to delete receipt:", err);
    }
  };

  if (loading) {
    return <LoadingState type="detail" />;
  }

  if (!group) {
    return (
      <EmptyState icon={PackageOpen} message="Группа не найдена" actionLabel="Назад" onAction={() => navigate("groups")} />
    );
  }

  const items = group.items;
  const groupReceipts = group.receipts;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("groups")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Назад к группам
      </Button>

      {/* Group Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Discount card image */}
            <div className="w-full sm:w-48 h-36 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border shrink-0">
              {group.discountCardPath ? (
                <img src={group.discountCardPath} alt="Discount card" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <CreditCard className="h-12 w-12 text-primary/40" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{group.network}</Badge>
                <Badge variant={group.status === "ACTIVE" ? "default" : "secondary"}>
                  {group.status === "ACTIVE" ? "Активно" : "Завершено"}
                </Badge>
                <span className="text-sm text-muted-foreground">{group.period}</span>
              </div>
              <h2 className="text-xl font-bold">{group.name}</h2>
              {group.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  Контактный номер: {group.phone}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Items Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Список товаров
        </h3>
        {items.length === 0 ? (
          <EmptyState icon={PackageOpen} message="Нет товаров в этой группе" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const purchased = purchaseState[item.id] ?? item.purchasedQty;
              const isFullyBought = purchased >= item.assignedQty;
              const isPartiallyBought = purchased > 0 && purchased < item.assignedQty;

              let bgColor = "bg-muted/50 border-muted";
              if (isFullyBought) bgColor = "bg-green-50 border-green-200";
              else if (isPartiallyBought) bgColor = "bg-orange-50 border-orange-200";

              return (
                <Card key={item.id} className={`${bgColor} transition-colors`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Product thumbnail */}
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                        {item.product.thumbnailPath ? (
                          <img src={item.product.thumbnailPath} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.product.brand}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.product.nomenclature}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.product.link && (
                            <a href={item.product.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Открыть на сайте магазина
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Qty info + selector */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">Нужно купить: {item.assignedQty} шт.</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Куплено:</span>
                          <Select
                            value={String(purchased)}
                            onValueChange={(v) => handlePurchaseChange(item.id, Number(v))}
                          >
                            <SelectTrigger className="w-16 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: item.assignedQty + 1 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>{i}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Status indicator */}
                        <div className="flex items-center gap-1">
                          {isFullyBought ? (
                            <><CheckCircle2 className="h-3 w-3 text-green-600" /><span className="text-xs text-green-600">Выполнено</span></>
                          ) : isPartiallyBought ? (
                            <><Clock className="h-3 w-3 text-orange-500" /><span className="text-xs text-orange-500">Частично</span></>
                          ) : (
                            <><XCircle className="h-3 w-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Не куплено</span></>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Receipts Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Ваши чеки
        </h3>

        {groupReceipts.length === 0 ? (
          <EmptyState icon={FileText} message="Вы еще не загрузили ни одного чека" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {groupReceipts.map((receipt) => (
              <Card key={receipt.id} className="overflow-hidden group relative">
                <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                  <img src={receipt.filePath} alt="Receipt" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-2">
                  <p className="text-xs text-muted-foreground">{new Date(receipt.uploadedAt).toLocaleString("ru-RU")}</p>
                  <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7" onClick={() => window.open(receipt.filePath, "_blank")}>
                    Открыть полностью
                  </Button>
                </CardContent>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 text-destructive"
                  onClick={() => handleDeleteReceipt(receipt.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Upload form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Загрузить чеки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer block">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {uploading ? "Загрузка..." : "Нажмите для выбора файлов или перетащите сюда"}
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Изображения будут сохранены на сервере.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
