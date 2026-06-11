"use client";

import { useState, useEffect } from "react";
import { useRouterContext } from "@/lib/router-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ClipboardList, Phone, DollarSign } from "lucide-react";
import { DiscountCardImage } from "@/components/shared/DiscountCardImage";

interface GroupData {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  network: string;
  name: string;
  phone: string | null;
  period: string;
  status: string;
  discountCardPath: string | null;
  totalSum: number | null;
  totalItems: number;
  completedItems: number;
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

export function UserGroupsPage() {
  const { navigate } = useRouterContext();
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await apiFetch<GroupData[]>("/api/groups");
        setGroups(data);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Мои задания</h1>
        <LoadingState type="cards" count={3} />
      </div>
    );
  }

  if (groups.length === 0) {
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
        {groups.map((group) => {
          const progressPercent = group.totalItems > 0 ? (group.completedItems / group.totalItems) * 100 : 0;
          return (
            <Card
              key={group.id}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30"
              onClick={() => navigate("group-detail", { id: group.id })}
            >
              <CardContent className="p-4 space-y-3">
                {/* Discount card thumbnail */}
                <DiscountCardImage src={group.discountCardPath} size="md" className="w-full h-32" />
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
                  <Badge variant={getStatusBadgeVariant(group.status)} className="text-xs">
                    {STATUS_LABELS[group.status] || group.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{group.period}</span>
                </div>
                {/* Total sum */}
                {group.totalSum !== null && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{Number(group.totalSum).toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
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
