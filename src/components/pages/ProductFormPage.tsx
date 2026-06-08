"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { products, networks } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ValidationErrors, FieldError } from "@/components/shared/ValidationErrors";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDemoState } from "@/app/page";
import { ArrowLeft, Save, Upload } from "lucide-react";

export function ProductFormPage() {
  const { routeParams, navigate } = useRouterContext();
  const { demoState } = useDemoState();
  const isEditing = !!routeParams.id;
  const editId = Number(routeParams.id) || 0;
  const existingProduct = isEditing ? products.find(p => p.id === editId) : null;

  const [network, setNetwork] = useState(existingProduct?.network || "");
  const [brand, setBrand] = useState(existingProduct?.brand || "");
  const [nomenclature, setNomenclature] = useState(existingProduct?.nomenclature || "");
  const [link, setLink] = useState(existingProduct?.link || "");
  const [monthlyPlanQty, setMonthlyPlanQty] = useState(String(existingProduct?.monthlyPlanQty || ""));
  const [isActive, setIsActive] = useState(existingProduct?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  if (demoState === "loading" || showLoading) {
    return <LoadingState type="form" count={6} />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!network) newErrors.network = "Выберите сеть";
    if (!brand.trim()) newErrors.brand = "Введите бренд";
    if (!nomenclature.trim()) newErrors.nomenclature = "Введите номенклатуру";
    if (!link.trim()) newErrors.link = "Введите ссылку";
    if (!monthlyPlanQty || Number(monthlyPlanQty) <= 0) newErrors.monthlyPlanQty = "Введите план";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("admin-products");
    }, 600);
  };

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("admin-products")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Назад к товарам
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Редактирование товара" : "Новый товар"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ValidationErrors errors={errors} className="mb-4" />
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="brand">Бренд</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Название бренда" />
              <FieldError message={errors.brand} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomenclature">Номенклатура</Label>
              <Textarea id="nomenclature" value={nomenclature} onChange={(e) => setNomenclature(e.target.value)} placeholder="Полное название товара" rows={2} />
              <FieldError message={errors.nomenclature} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Ссылка на товар</Label>
              <Input id="link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
              <FieldError message={errors.link} />
            </div>

            <div className="space-y-2">
              <Label>Скрин товара</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Загрузите изображение товара</p>
                <input type="file" className="hidden" accept="image/*" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">План по количеству в месяц</Label>
              <Input id="plan" type="number" value={monthlyPlanQty} onChange={(e) => setMonthlyPlanQty(e.target.value)} placeholder="0" min="1" />
              <FieldError message={errors.monthlyPlanQty} />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              <Label htmlFor="active" className="cursor-pointer">Активен</Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-1" />
                {loading ? "Сохранение..." : "Сохранить"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("admin-products")}>
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
