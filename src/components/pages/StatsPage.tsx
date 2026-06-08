"use client";

import { statsByProducts, statsByUsers } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDemoState } from "@/app/page";
import { BarChart3, Users, Package, TrendingUp } from "lucide-react";

export function StatsPage() {
  const { demoState } = useDemoState();

  if (demoState === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Статистика</h1>
        <LoadingState type="table" count={4} />
      </div>
    );
  }

  const productStats = demoState === "empty" ? [] : statsByProducts;
  const userStats = demoState === "empty" ? [] : statsByUsers;

  // Summary cards
  const totalPlan = productStats.reduce((sum, p) => sum + p.monthlyPlan, 0);
  const totalAssigned = productStats.reduce((sum, p) => sum + p.assigned, 0);
  const totalConfirmedUser = productStats.reduce((sum, p) => sum + p.confirmedByUser, 0);
  const totalConfirmedMod = productStats.reduce((sum, p) => sum + p.confirmedByModerator, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Статистика</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalPlan}</p>
            <p className="text-xs text-muted-foreground">План/мес</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalAssigned}</p>
            <p className="text-xs text-muted-foreground">Назначено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalConfirmedUser}</p>
            <p className="text-xs text-muted-foreground">Подтв. пользователями</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalConfirmedMod}</p>
            <p className="text-xs text-muted-foreground">Подтв. модератором</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">По товарам</TabsTrigger>
          <TabsTrigger value="users">По пользователям</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {productStats.length === 0 ? (
            <EmptyState icon={Package} message="Нет данных по товарам" />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Товар</TableHead>
                      <TableHead className="text-center">План/мес</TableHead>
                      <TableHead className="text-center">Назначено</TableHead>
                      <TableHead className="text-center">Подтв. пользователями</TableHead>
                      <TableHead className="text-center">Подтв. модератором</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productStats.map(s => (
                      <TableRow key={s.productId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.brand}</p>
                            <p className="text-xs text-muted-foreground">{s.nomenclature}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{s.monthlyPlan}</TableCell>
                        <TableCell className="text-center">{s.assigned}</TableCell>
                        <TableCell className="text-center">
                          <span className={s.confirmedByUser > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                            {s.confirmedByUser}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={s.confirmedByModerator > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                            {s.confirmedByModerator}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {productStats.map(s => (
                  <Card key={s.productId}>
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{s.brand}</p>
                      <p className="text-xs text-muted-foreground mb-2">{s.nomenclature}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted rounded p-2 text-center">
                          <p className="font-bold">{s.monthlyPlan}</p>
                          <p className="text-muted-foreground">План</p>
                        </div>
                        <div className="bg-muted rounded p-2 text-center">
                          <p className="font-bold">{s.assigned}</p>
                          <p className="text-muted-foreground">Назначено</p>
                        </div>
                        <div className="bg-green-50 rounded p-2 text-center">
                          <p className="font-bold text-green-600">{s.confirmedByUser}</p>
                          <p className="text-muted-foreground">Пользователи</p>
                        </div>
                        <div className="bg-green-50 rounded p-2 text-center">
                          <p className="font-bold text-green-600">{s.confirmedByModerator}</p>
                          <p className="text-muted-foreground">Модератор</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          {userStats.length === 0 ? (
            <EmptyState icon={Users} message="Нет данных по пользователям" />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead className="text-center">Кол-во групп</TableHead>
                      <TableHead className="text-center">Назначено товаров</TableHead>
                      <TableHead className="text-center">Подтверждено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userStats.map(s => (
                      <TableRow key={s.userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{s.groupsCount}</TableCell>
                        <TableCell className="text-center">{s.assignedItems}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-medium">{s.confirmedItems}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {userStats.map(s => (
                  <Card key={s.userId}>
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{s.email}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-muted rounded p-2 text-center">
                          <p className="font-bold">{s.groupsCount}</p>
                          <p className="text-muted-foreground">Группы</p>
                        </div>
                        <div className="bg-muted rounded p-2 text-center">
                          <p className="font-bold">{s.assignedItems}</p>
                          <p className="text-muted-foreground">Назначено</p>
                        </div>
                        <div className="bg-green-50 rounded p-2 text-center">
                          <p className="font-bold text-green-600">{s.confirmedItems}</p>
                          <p className="text-muted-foreground">Подтв.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
