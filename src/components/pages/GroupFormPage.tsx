"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { users, networks, products, getItemsForGroup, groups } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ValidationErrors, FieldError } from "@/components/shared/ValidationErrors";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDemoState } from "@/app/page";
import { ArrowLeft, Save, Plus, Search, Upload, X } from "lucide-react";

interface AddedItem {
  productId: number;
  brand: string;
  nomenclature: string;
  qty: number;
}

export function GroupFormPage() {
  const { routeParams, navigate } = useRouterContext();
  const { demoState } = useDemoState();
  const isEditing = !!routeParams.id;
  const editId = Number(routeParams.id) || 0;
  const existingGroup = isEditing ? groups.find(g => g.id === editId) : null;

  const [userId, setUserId] = useState(String(existingGroup?.userId || ""));
  const [network, setNetwork] = useState(existingGroup?.network || "");
  const [name, setName] = useState(existingGroup?.name || "");
  const [phone, setPhone] = useState(existingGroup?.phone || "");
  const [period, setPeriod] = useState(existingGroup?.period || "");
  const [status, setStatus] = useState<"active" | "completed">(existingGroup?.status || "active");
  const [addedItems, setAddedItems] = useState<AddedItem[]>(() => {
    if (isEditing) {
      const items = getItemsForGroup(editId);
      return items.map(i => ({ productId: i.productId, brand: i.brand, nomenclature: i.nomenclature, qty: i.assignedQty }));
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNetwork, setSearchNetwork] = useState<string>("all");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  if (demoState === "loading" || showLoading) {
    return <LoadingState type="form" count={8} />;
  }

  const addItem = (product: typeof products[0]) => {
    if (addedItems.find(i => i.productId === product.id)) return;
    setAddedItems(prev => [...prev, { productId: product.id, brand: product.brand, nomenclature: product.nomenclature, qty: 1 }]);
  };

  const removeItem = (productId: number) => {
    setAddedItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateItemQty = (productId: number, qty: number) => {
    setAddedItems(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const filteredSearchProducts = products.filter(p => {
    const matchSearch = !searchQuery || p.brand.toLowerCase().includes(searchQuery.toLowerCase()) || p.nomenclature.toLowerCase().includes(searchQuery.toLowerCase());
    const matchNetwork = searchNetwork === "all" || p.network === searchNetwork;
    const notAdded = !addedItems.find(i => i.productId === p.id);
    return matchSearch && matchNetwork && notAdded && p.isActive;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!userId) newErrors.userId = "Выберите пользователя";
    if (!network) newErrors.network = "Выберите сеть";
    if (!name.trim()) newErrors.name = "Введите название группы";
    if (!period.trim()) newErrors.period = "Введите период";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("admin-groups");
    }, 600);
  };

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("admin-groups")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Назад к группам
      </Button>

      <ValidationErrors errors={errors} className="mb-4" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Block 1 — Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Пользователь</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.userId} />
            </div>

            <div className="space-y-2">
              <Label>Сеть</Label>
              <Select value={network} onValueChange={setNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сеть" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map(n => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.network} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-name">Название группы</Label>
              <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Закупка июнь — Магнит" />
              <FieldError message={errors.name} />
            </div>

            <div className="space-y-2">
              <Label>Загрузка скрина дисконтной карты</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Загрузите скриншот карты (будет конвертирован в WebP)</p>
                <input type="file" className="hidden" accept="image/*" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (900) 123-45-67" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Период</Label>
              <Input id="period" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Июнь 2025" />
              <FieldError message={errors.period} />
            </div>

            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "completed")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активно</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Block 2 — Items */}
        <Card>
          <CardHeader>
            <CardTitle>Товары в группе</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search block */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Добавить товар</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по названию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={searchNetwork} onValueChange={setSearchNetwork}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Сеть" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все сети</SelectItem>
                    {networks.map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredSearchProducts.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                  {filteredSearchProducts.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="font-medium text-xs">{p.brand}</span>
                        <span className="text-xs text-muted-foreground ml-1 truncate">{p.nomenclature}</span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="shrink-0 h-7 text-xs" onClick={() => addItem(p)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Добавить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {filteredSearchProducts.length === 0 && searchQuery && (
                <p className="text-xs text-muted-foreground text-center py-2">Ничего не найдено</p>
              )}
            </div>

            {/* Added items list */}
            {addedItems.length > 0 && (
              <div className="space-y-2">
                {addedItems.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.brand}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.nomenclature}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs">Нужно купить (шт.):</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateItemQty(item.productId, Number(e.target.value) || 1)}
                        className="w-16 h-8 text-sm"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.productId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {addedItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Добавьте товары из поиска выше</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-1" />
            {loading ? "Сохранение..." : "Сохранить группу"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("admin-groups")}>
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
