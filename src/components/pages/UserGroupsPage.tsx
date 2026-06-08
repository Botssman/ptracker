"use client";

import { useRouterContext } from "@/lib/router-context";
import { groups, getGroupsForUser } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ClipboardList, CreditCard, Phone } from "lucide-react";
import { useDemoState } from "@/app/page";

export function UserGroupsPage() {
  const { navigate, routeParams } = useRouterContext();
  const { demoState } = useDemoState();
  const userId = (routeParams.userId as number) || 3;

  if (demoState === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Мои задания</h1>
        <LoadingState type="cards" count={3} />
      </div>
    );
  }

  const userGroups = demoState === "empty" ? [] : getGroupsForUser(userId);

  if (userGroups.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Мои задания</h1>
        <EmptyState
          icon={ClipboardList}
          message="У вас пока нет активных заданий"
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Мои задания</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userGroups.map((group) => {
          const progressPercent = group.totalItems > 0 ? (group.completedItems / group.totalItems) * 100 : 0;
          return (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30"
              onClick={() => navigate("group-detail", { id: group.id })}
            >
              <CardContent className="p-4 space-y-3">
                {/* Discount card thumbnail */}
                <div className="w-full h-32 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border">
                  <CreditCard className="h-10 w-10 text-primary/40" />
                </div>
                {/* Network badge */}
                <Badge variant="outline" className="text-xs">{group.network}</Badge>
                {/* Group name */}
                <h3 className="font-semibold text-sm leading-tight">{group.name}</h3>
                {/* Phone */}
                {group.phone && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {group.phone}
                  </div>
                )}
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={group.status === "active" ? "default" : "secondary"} className="text-xs">
                    {group.status === "active" ? "Активно" : "Завершено"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{group.period}</span>
                </div>
                {/* Progress */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Выполнено {group.completedItems} из {group.totalItems} товаров
                  </p>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
