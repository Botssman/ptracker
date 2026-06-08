"use client";

import { useState } from "react";
import { useRouterContext } from "@/lib/router-context";
import { groups, getItemsForGroup, getReceiptsForGroup } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDemoState } from "@/app/page";
import {
  ArrowLeft, CreditCard, Phone, ExternalLink, ShoppingCart,
  Upload, Image as ImageIcon, PackageOpen, FileText, CheckCircle2, Clock, XCircle
} from "lucide-react";

export function GroupDetailPage() {
  const { routeParams, navigate } = useRouterContext();
  const { demoState } = useDemoState();
  const groupId = Number(routeParams.id) || 1;
  const [purchaseState, setPurchaseState] = useState<Record<number, number>>({});

  if (demoState === "loading") {
    return <LoadingState type="detail" />;
  }

  const group = groups.find(g => g.id === groupId);
  if (!group) {
    return (
      <EmptyState icon={PackageOpen} message="Группа не найдена" actionLabel="Назад" onAction={() => navigate("groups")} />
    );
  }

  const items = demoState === "empty" ? [] : getItemsForGroup(groupId);
  const groupReceipts = demoState === "empty" ? [] : getReceiptsForGroup(groupId);

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
              <CreditCard className="h-12 w-12 text-primary/40" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{group.network}</Badge>
                <Badge variant={group.status === "active" ? "default" : "secondary"}>
                  {group.status === "active" ? "Активно" : "Завершено"}
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
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.brand}</p>
                        <p className="text-sm text-muted-foreground truncate">{item.nomenclature}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Открыть на сайте магазина
                          </a>
                        </div>
                      </div>
                      {/* Qty info + selector */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">Нужно купить: {item.assignedQty} шт.</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Куплено:</span>
                          <Select
                            value={String(purchased)}
                            onValueChange={(v) => setPurchaseState(prev => ({ ...prev, [item.id]: Number(v) }))}
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
              <Card key={receipt.id} className="overflow-hidden">
                <div className="aspect-[3/4] bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardContent className="p-2">
                  <p className="text-xs text-muted-foreground">{receipt.uploadedAt}</p>
                  <Button variant="ghost" size="sm" className="w-full mt-1 text-xs h-7">
                    Открыть полностью
                  </Button>
                </CardContent>
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
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Нажмите для выбора файлов или перетащите сюда</p>
              <input type="file" multiple className="hidden" accept="image/*" />
            </div>
            <p className="text-xs text-muted-foreground">
              Изображения будут автоматически конвертированы в формат WebP для оптимизации размера.
            </p>
            <Button size="sm">Загрузить</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
