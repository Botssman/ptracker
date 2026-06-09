"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { apiFetch, apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ValidationErrors, FieldError } from "@/components/shared/ValidationErrors";
import { LoadingState } from "@/components/shared/LoadingState";
import { ArrowLeft, Save, Upload, Download, Loader2, Image as ImageIcon, X } from "lucide-react";

interface ProductData {
  id: number;
  network: string;
  brand: string;
  nomenclature: string;
  link: string | null;
  monthlyPlanQty: number;
  isActive: boolean;
  thumbnailPath: string | null;
}

interface NetworkData {
  id: number;
  name: string;
  createdAt: string;
}

interface ScrapeResult {
  title: string;
  imageUrl: string;
}

export function ProductFormPage() {
  const { routeParams, navigate } = useRouterContext();
  const isEditing = !!routeParams.id;
  const editId = Number(routeParams.id) || 0;

  const [network, setNetwork] = useState("");
  const [brand, setBrand] = useState("");
  const [nomenclature, setNomenclature] = useState("");
  const [link, setLink] = useState("");
  const [monthlyPlanQty, setMonthlyPlanQty] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [networks, setNetworks] = useState<NetworkData[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const networksData = await apiFetch<NetworkData[]>("/api/networks");
        setNetworks(networksData);

        if (isEditing) {
          const data = await apiFetch<ProductData>(`/api/products/${editId}`);
          setNetwork(data.network);
          setBrand(data.brand);
          setNomenclature(data.nomenclature);
          setLink(data.link || "");
          setMonthlyPlanQty(String(data.monthlyPlanQty));
          setIsActive(data.isActive);
          setThumbnailPath(data.thumbnailPath);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setPageLoading(false);
      }
    }
    fetchData();
  }, [isEditing, editId]);

  const handleScrapeProduct = async () => {
    if (!link.trim()) {
      setErrors(prev => ({ ...prev, link: "Введите ссылку для автозаполнения" }));
      return;
    }

    setScraping(true);
    setErrors(prev => {
      const { link: _, ...rest } = prev;
      return rest;
    });

    try {
      const result = await apiFetch<ScrapeResult>("/api/scrape-product", {
        method: "POST",
        body: JSON.stringify({ url: link.trim() }),
      });

      if (result.title && !nomenclature.trim()) {
        setNomenclature(result.title);
      }
      if (result.imageUrl) {
        setThumbnailPath(result.imageUrl);
      }
      if (!result.title && !result.imageUrl) {
        setErrors(prev => ({ ...prev, scrape: "Не удалось получить данные со страницы" }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка загрузки данных";
      setErrors(prev => ({ ...prev, scrape: msg }));
    } finally {
      setScraping(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subfolder", "products");
      const result = await apiUpload<{ filePath: string }>(`/api/upload`, formData);
      setThumbnailPath(result.filePath);
    } catch (err) {
      console.error("Failed to upload thumbnail:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!network) newErrors.network = "Выберите сеть";
    if (!brand.trim()) newErrors.brand = "Введите бренд";
    if (!nomenclature.trim()) newErrors.nomenclature = "Введите номенклатуру";
    if (!monthlyPlanQty || Number(monthlyPlanQty) <= 0) newErrors.monthlyPlanQty = "Введите план";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        network,
        brand: brand.trim(),
        nomenclature: nomenclature.trim(),
        link: link.trim() || null,
        monthlyPlanQty: Number(monthlyPlanQty),
        isActive,
        thumbnailPath,
      };

      if (isEditing) {
        await apiFetch(`/api/products/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      navigate("admin-products");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Ошибка сохранения" });
    } finally {
      setLoading(false);
    }
  };

  const isExternalImage = thumbnailPath && thumbnailPath.startsWith("http");

  if (pageLoading) {
    return <LoadingState type="form" count={6} />;
  }

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
                    <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>
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
              <div className="flex gap-2">
                <Input
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://magnit.ru/product/..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScrapeProduct}
                  disabled={scraping || !link.trim()}
                  className="shrink-0"
                >
                  {scraping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">
                    {scraping ? "Загрузка..." : "Заполнить"}
                  </span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Вставьте ссылку и нажмите «Заполнить» — название и фото подтянутся автоматически
              </p>
              <FieldError message={errors.link || errors.scrape} />
            </div>

            <div className="space-y-2">
              <Label>Фото товара</Label>
              {thumbnailPath ? (
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-lg border overflow-hidden bg-muted">
                    <img
                      src={thumbnailPath}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      crossOrigin={isExternalImage ? "anonymous" : undefined}
                      referrerPolicy={isExternalImage ? "no-referrer" : undefined}
                      onError={(e) => {
                        // If external image fails to load, try with no-referrer
                        const img = e.currentTarget;
                        if (!img.dataset.retried) {
                          img.dataset.retried = "1";
                          img.src = thumbnailPath;
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 text-destructive"
                      onClick={() => setThumbnailPath(null)}
                    >
                      <X className="h-3 w-3 mr-0.5" />
                      Удалить
                    </Button>
                  </div>
                  {isExternalImage && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Изображение с внешнего сайта
                    </p>
                  )}
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {uploading ? "Загрузка..." : "Загрузите фото или получите автоматически по ссылке"}
                  </p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} disabled={uploading} />
                </label>
              )}
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
