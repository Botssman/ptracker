"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Plus, Search, ExternalLink, Pencil, Trash2, Package, Check, X, Image as ImageIcon } from "lucide-react";

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

export function AdminProductsPage() {
  const { navigate } = useRouterContext();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [networks, setNetworks] = useState<NetworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsData, networksData] = await Promise.all([
          apiFetch<ProductData[]>("/api/products"),
          apiFetch<NetworkData[]>("/api/networks"),
        ]);
        setProducts(productsData);
        setNetworks(networksData);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить товар?")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Товары</h1>
        </div>
        <LoadingState type="table" count={5} />
      </div>
    );
  }

  let filteredProducts = [...products];

  if (search) {
    const q = search.toLowerCase();
    filteredProducts = filteredProducts.filter(
      p => p.brand.toLowerCase().includes(q) || p.nomenclature.toLowerCase().includes(q)
    );
  }
  if (networkFilter !== "all") {
    filteredProducts = filteredProducts.filter(p => p.network === networkFilter);
  }
  if (brandFilter !== "all") {
    filteredProducts = filteredProducts.filter(p => p.brand === brandFilter);
  }

  const networkNames = networks.map(n => n.name);
  const brands = [...new Set(products.map(p => p.brand))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Товары</h1>
        <Button onClick={() => navigate("product-form")} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Добавить товар
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или бренду..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
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
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Бренд" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все бренды</SelectItem>
                {brands.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      {filteredProducts.length === 0 ? (
        <EmptyState icon={Package} message="Товары не найдены" />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Фото</TableHead>
                  <TableHead>Сеть</TableHead>
                  <TableHead>Бренд</TableHead>
                  <TableHead>Номенклатура</TableHead>
                  <TableHead>Ссылка</TableHead>
                  <TableHead className="text-center">План/мес</TableHead>
                  <TableHead className="text-center">Активен</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {product.thumbnailPath ? (
                          <img
                            src={product.thumbnailPath}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy={product.thumbnailPath.startsWith("http") ? "no-referrer" : undefined}
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{product.network}</Badge></TableCell>
                    <TableCell className="font-medium">{product.brand}</TableCell>
                    <TableCell className="max-w-xs truncate">{product.nomenclature}</TableCell>
                    <TableCell>
                      {product.link ? (
                        <a href={product.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center">{product.monthlyPlanQty}</TableCell>
                    <TableCell className="text-center">
                      {product.isActive ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate("product-form", { id: product.id })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
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
            {filteredProducts.map(product => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Product thumbnail */}
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {product.thumbnailPath ? (
                        <img
                          src={product.thumbnailPath}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy={product.thumbnailPath.startsWith("http") ? "no-referrer" : undefined}
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <Badge variant="outline" className="text-xs mb-1">{product.network}</Badge>
                          <p className="font-medium text-sm">{product.brand}</p>
                        </div>
                        {product.isActive ? (
                          <Badge className="text-xs bg-green-100 text-green-700">Активен</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Неактивен</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 truncate">{product.nomenclature}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">План: {product.monthlyPlanQty}/мес</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("product-form", { id: product.id })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
