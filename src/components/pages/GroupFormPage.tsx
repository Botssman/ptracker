"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { apiFetch, apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ValidationErrors, FieldError } from "@/components/shared/ValidationErrors";
import { LoadingState } from "@/components/shared/LoadingState";
import { ArrowLeft, Save, Plus, Search, Upload, X } from "lucide-react";

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ProductData {
  id: number;
  network: string;
  brand: string;
  nomenclature: string;
  link: string | null;
  monthlyPlanQty: number;
  isActive: boolean;
}

interface ExistingItem {
  id: number;
  productId: number;
  assignedQty: number;
  purchasedQty: number;
  product: { brand: string; nomenclature: string };
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
  items: ExistingItem[];
}

interface AddedItem {
  productId: number;
  brand: string;
  nomenclature: string;
  qty: number;
}

interface NetworkData {
  id: number;
  name: string;
  createdAt: string;
}

export function GroupFormPage() {
  const { routeParams, navigate } = useRouterContext();
  const isEditing = !!routeParams.id;
  const editId = Number(routeParams.id) || 0;

  const [userId, setUserId] = useState("");
  const [network, setNetwork] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [discountCardPath, setDiscountCardPath] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [users, setUsers] = useState<UserData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [networks, setNetworks] = useState<NetworkData[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersData, productsData, networksData] = await Promise.all([
          apiFetch<UserData[]>("/api/users"),
          apiFetch<ProductData[]>("/api/products"),
          apiFetch<NetworkData[]>("/api/networks"),
        ]);
        setUsers(usersData);
        setProducts(productsData);
        setNetworks(networksData);

        if (isEditing) {
          const groupData = await apiFetch<GroupDetail>(`/api/groups/${editId}`);
          setUserId(String(groupData.userId));
          setNetwork(groupData.network);
          setName(groupData.name);
          setPhone(groupData.phone || "");
          setPeriod(groupData.period);
          setStatus(groupData.status as "ACTIVE" | "COMPLETED");
          setDiscountCardPath(groupData.discountCardPath);
          setAddedItems(
            groupData.items.map(i => ({
              productId: i.productId,
              brand: i.product.brand,
              nomenclature: i.product.nomenclature,
              qty: i.assignedQty,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setPageLoading(false);
      }
    }
    fetchData();
  }, [isEditing, editId]);

  const handleCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subfolder", "cards");
      const result = await apiUpload<{ filePath: string }>("/api/upload", formData);
      setDiscountCardPath(result.filePath);
    } catch (err) {
      console.error("Failed to upload card:", err);
    } finally {
      setUploading(false);
    }
  };

  const addItem = (product: ProductData) => {
    if (addedItems.find(i => i.productId === product.id)) return;
    setAddedItems(prev => [...prev, { productId: product.id, brand: product.brand, nomenclature: product.nomenclature, qty: 1 }]);
  };

  const removeItem = (productId: number) => {
    setAddedItems(prev => prev.filter(i => i.productId !== productId));
  };

  const updateItemQty = (productId: number, qty: number) => {
    setAddedItems(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const filteredSearchProducts = network
    ? products.filter(p => {
        const matchNetwork = p.network === network;
        const matchSearch = !searchQuery || p.brand.toLowerCase().includes(searchQuery.toLowerCase()) || p.nomenclature.toLowerCase().includes(searchQuery.toLowerCase());
        const notAdded = !addedItems.find(i => i.productId === p.id);
        return matchNetwork && matchSearch && notAdded && p.isActive;
      })
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!userId) newErrors.userId = "Выберите пользователя";
    if (!network) newErrors.network = "Выберите сеть";
    if (!name.trim()) newErrors.name = "Введите название группы";
    if (!period.trim()) newErrors.period = "Введите период";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        userId: Number(userId),
        network,
        name: name.trim(),
        phone: phone.trim() || null,
        period: period.trim(),
        status,
        discountCardPath,
        items: addedItems.map(i => ({ productId: i.productId, assignedQty: i.qty })),
      };

      if (isEditing) {
        await apiFetch(`/api/groups/${editId}`, {
          method: "PUT",
          body: JSON.stringify({
            userId: Number(userId),
            network,
            name: name.trim(),
            phone: phone.trim() || null,
            period: period.trim(),
            status,
            discountCardPath,
            items: addedItems.map(i => ({ productId: i.productId, assignedQty: i.qty })),
          }),
        });
      } else {
        await apiFetch("/api/groups", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      navigate("admin-groups");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Ошибка сохранения" });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return <LoadingState type="form" count={8} />;
  }

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
              <Select value={network} onValueChange={(v) => {
                setNetwork(v);
                setAddedItems([]);
                setSearchQuery("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите сеть" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map(n => (
                    <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
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
              {discountCardPath ? (
                <div className="relative">
                  <img src={discountCardPath} alt="Discount card" className="w-48 h-32 object-cover rounded border" />
                  <Button type="button" variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setDiscountCardPath(null)}>Удалить</Button>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">{uploading ? "Загрузка..." : "Загрузите скриншот карты"}</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleCardUpload} disabled={uploading} />
                </label>
              )}
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
              <Select value={status} onValueChange={(v) => setStatus(v as "ACTIVE" | "COMPLETED")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Активно</SelectItem>
                  <SelectItem value="COMPLETED">Завершено</SelectItem>
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
              {!network ? (
                <p className="text-sm text-muted-foreground text-center py-3">Сначала выберите сеть выше, чтобы добавить товары</p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Поиск по товарам ${network}...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
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
                </>
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
            {addedItems.length === 0 && network && (
              <p className="text-sm text-muted-foreground text-center py-4">Добавьте товары из поиска выше</p>
            )}
            {addedItems.length === 0 && !network && (
              <p className="text-sm text-muted-foreground text-center py-4">Выберите сеть для добавления товаров</p>
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
