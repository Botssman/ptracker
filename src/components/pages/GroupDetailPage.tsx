"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiUpload } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import {
  ArrowLeft, CreditCard, Phone, ExternalLink, ShoppingCart,
  Upload, Image as ImageIcon, PackageOpen, FileText, CheckCircle2, Clock, XCircle, Trash2,
  Send, RotateCcw, Copy, DollarSign
} from "lucide-react";

interface ItemData {
  id: number;
  productId: number;
  assignedQty: number;
  purchasedQty: number;
  userMarkedQty: number;
  modConfirmed: boolean;
  price: number | null;
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
  totalSum: number | null;
  user: { name: string; email: string };
  items: ItemData[];
  receipts: ReceiptData[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активно",
  PENDING_REVIEW: "На проверке",
  COMPLETED: "Завершено",
};

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "PENDING_REVIEW") return "outline";
  return "secondary";
}

export function GroupDetailPage() {
  const { routeParams, navigate } = useRouterContext();
  const { user } = useAuth();
  const groupId = Number(routeParams.id) || 0;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseState, setPurchaseState] = useState<Record<number, number>>({});
  const [priceState, setPriceState] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalSumInput, setTotalSumInput] = useState<string>("");
  const [savingTotalSum, setSavingTotalSum] = useState(false);

  const isAdmin = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const isOwner = group ? group.userId === Number(user?.id) : false;
  const canEditItems = group?.status === "ACTIVE";
  const canSubmitForReview = group?.status === "ACTIVE" && (isOwner || isAdmin);
  const canComplete = group?.status === "PENDING_REVIEW" && isAdmin;
  const canReturnToActive = (group?.status === "PENDING_REVIEW" || group?.status === "COMPLETED") && isAdmin;

  useEffect(() => {
    async function fetchGroup() {
      try {
        const data = await apiFetch<GroupDetail>(`/api/groups/${groupId}`);
        setGroup(data);
        // Initialize purchase state from data
        const pState: Record<number, number> = {};
        const prState: Record<number, string> = {};
        data.items.forEach(item => {
          pState[item.id] = item.purchasedQty;
          prState[item.id] = item.price !== null ? String(item.price) : "";
        });
        setPurchaseState(pState);
        setPriceState(prState);
        setTotalSumInput(data.totalSum !== null ? String(data.totalSum) : "");
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

  const refreshGroup = async () => {
    const data = await apiFetch<GroupDetail>(`/api/groups/${groupId}`);
    setGroup(data);
    const pState: Record<number, number> = {};
    const prState: Record<number, string> = {};
    data.items.forEach(item => {
      pState[item.id] = item.purchasedQty;
      prState[item.id] = item.price !== null ? String(item.price) : "";
    });
    setPurchaseState(pState);
    setPriceState(prState);
    setTotalSumInput(data.totalSum !== null ? String(data.totalSum) : "");
  };

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

  const handlePriceChange = async (itemId: number, price: string) => {
    setPriceState(prev => ({ ...prev, [itemId]: price }));
  };

  const handlePriceSave = async (itemId: number) => {
    const priceStr = priceState[itemId];
    const priceVal = priceStr === "" ? null : parseFloat(priceStr);
    try {
      await apiFetch(`/api/groups/${groupId}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ price: priceVal }),
      });
      await refreshGroup();
    } catch (err) {
      console.error("Failed to update price:", err);
    }
  };

  const handleConfirmItem = async (itemId: number, confirmed: boolean) => {
    try {
      await apiFetch(`/api/groups/${groupId}/items/${itemId}`, {
        method: "PUT",
        body: JSON.stringify({ modConfirmed: confirmed }),
      });
      await refreshGroup();
    } catch (err) {
      console.error("Failed to confirm item:", err);
    }
  };

  const handleSubmitForReview = async () => {
    if (!confirm("Отправить группу на проверку?")) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "PENDING_REVIEW" }),
      });
      await refreshGroup();
    } catch (err) {
      console.error("Failed to submit for review:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm("Завершить группу?")) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      await refreshGroup();
    } catch (err) {
      console.error("Failed to complete group:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToActive = async () => {
    if (!confirm("Вернуть группу в активные?")) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      await refreshGroup();
    } catch (err) {
      console.error("Failed to return to active:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTotalSum = async () => {
    setSavingTotalSum(true);
    try {
      const val = totalSumInput === "" ? null : parseFloat(totalSumInput);
      await apiFetch(`/api/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify({ totalSum: val }),
      });
      await refreshGroup();
    } catch (err) {
      console.error("Failed to save total sum:", err);
    } finally {
      setSavingTotalSum(false);
    }
  };

  const handleCopyUnfulfilled = async () => {
    if (!group) return;
    if (!confirm("Создать новую группу с невыполненными товарами?")) return;
    setSubmitting(true);
    try {
      const unfulfilledItems = group.items.filter(i => i.purchasedQty < i.assignedQty);
      if (unfulfilledItems.length === 0) {
        alert("Нет невыполненных товаров");
        setSubmitting(false);
        return;
      }
      await apiFetch("/api/groups", {
        method: "POST",
        body: JSON.stringify({
          userId: group.userId,
          network: group.network,
          name: `${group.name} (доп.)`,
          phone: group.phone,
          period: group.period,
          status: "ACTIVE",
          discountCardPath: group.discountCardPath,
          items: unfulfilledItems.map(i => ({
            productId: i.productId,
            assignedQty: i.assignedQty - i.purchasedQty,
          })),
        }),
      });
      alert("Новая группа создана с невыполненными товарами");
    } catch (err) {
      console.error("Failed to copy unfulfilled:", err);
    } finally {
      setSubmitting(false);
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
      await refreshGroup();
    } catch (err) {
      console.error("Failed to upload receipts:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: number) => {
    try {
      await apiFetch(`/api/receipts/${receiptId}`, { method: "DELETE" });
      await refreshGroup();
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
  const totalItems = items.length;
  const completedItems = items.filter(i => i.purchasedQty >= i.assignedQty).length;
  const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Calculate sum from item prices
  const calculatedSum = items.reduce((sum, item) => {
    const price = item.price ?? 0;
    return sum + price * item.purchasedQty;
  }, 0);

  const displaySum = group.totalSum !== null ? group.totalSum : calculatedSum;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(isAdmin ? "admin-groups" : "groups")} className="mb-2">
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
                <Badge variant={getStatusBadgeVariant(group.status)}>
                  {STATUS_LABELS[group.status] || group.status}
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
              {/* Progress bar */}
              <div className="space-y-1 pt-2">
                <p className="text-xs text-muted-foreground">
                  Выполнено {completedItems} из {totalItems} товаров
                </p>
                <Progress value={progressPercent} className="h-2" />
              </div>
              {/* Total sum display */}
              <div className="pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    Сумма: {displaySum > 0 ? displaySum.toLocaleString("ru-RU") + " ₽" : "не указана"}
                  </span>
                </div>
                {group.totalSum !== null && calculatedSum > 0 && (
                  <p className="text-xs text-muted-foreground ml-6">
                    (Расчётная сумма по товарам: {calculatedSum.toLocaleString("ru-RU")} ₽)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {canSubmitForReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSubmitForReview}
                disabled={submitting}
              >
                <Send className="h-4 w-4 mr-1" />
                Отправить на проверку
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                variant="default"
                onClick={handleComplete}
                disabled={submitting}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Завершить
              </Button>
            )}
            {canReturnToActive && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReturnToActive}
                disabled={submitting}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Вернуть в активные
              </Button>
            )}
            {isAdmin && (group.status === "PENDING_REVIEW" || group.status === "COMPLETED") && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyUnfulfilled}
                disabled={submitting}
              >
                <Copy className="h-4 w-4 mr-1" />
                Скопировать невыполненные
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin: Total Sum Override */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Итоговая сумма
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                step="0.01"
                placeholder="Введите сумму (оставьте пустым для расчётной)"
                value={totalSumInput}
                onChange={(e) => setTotalSumInput(e.target.value)}
                className="max-w-xs"
              />
              <Button size="sm" onClick={handleSaveTotalSum} disabled={savingTotalSum}>
                {savingTotalSum ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Если сумма указана вручную, она отображается вместо расчётной суммы по товарам.
            </p>
          </CardContent>
        </Card>
      )}

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
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Product thumbnail */}
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {item.product.thumbnailPath ? (
                            <img
                              src={item.product.thumbnailPath}
                              alt=""
                              className="w-full h-full object-cover rounded"
                              referrerPolicy={item.product.thumbnailPath.startsWith("http") ? "no-referrer" : undefined}
                            />
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
                            {canEditItems ? (
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
                            ) : (
                              <span className="text-sm font-medium">{purchased} шт.</span>
                            )}
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
                          {/* Admin confirm indicator */}
                          {item.modConfirmed && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-600">Подтверждено</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin controls row */}
                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                          {/* Price input */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Цена/шт:</span>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="—"
                              value={priceState[item.id] ?? ""}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              className="w-24 h-8 text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handlePriceSave(item.id)}
                            >
                              Ок
                            </Button>
                            {item.price !== null && (
                              <span className="text-xs text-muted-foreground">
                                = {(item.price * purchased).toLocaleString("ru-RU")} ₽
                              </span>
                            )}
                          </div>
                          {/* Confirm toggle */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant={item.modConfirmed ? "default" : "outline"}
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => handleConfirmItem(item.id, !item.modConfirmed)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {item.modConfirmed ? "Подтверждено" : "Подтвердить"}
                            </Button>
                          </div>
                        </div>
                      )}
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
