"use client";

import { useState } from "react";
import { inviteCodes } from "@/lib/mock-data";
import type { UserRole, InviteCodeStatus } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useDemoState } from "@/app/page";
import { Plus, Copy, Check, KeyRound, Ticket } from "lucide-react";

const statusConfig: Record<InviteCodeStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  unused: { label: "Не использован", variant: "default" },
  used: { label: "Использован", variant: "secondary" },
  expired: { label: "Просрочен", variant: "outline" },
};

export function InviteCodesPage() {
  const { demoState } = useDemoState();
  const [generateRole, setGenerateRole] = useState<UserRole>("user");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  if (demoState === "loading") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Коды приглашения</h1>
        <LoadingState type="table" count={4} />
      </div>
    );
  }

  const displayCodes = demoState === "empty" ? [] : inviteCodes;

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const nums = "23456789";
    const seg = () =>
      Array.from({ length: 4 }, () =>
        Math.random() > 0.5 ? chars[Math.floor(Math.random() * chars.length)] : nums[Math.floor(Math.random() * nums.length)]
      ).join("");
    const code = `${seg()}-${seg()}-${seg()}`;
    setGeneratedCode(code);
    setShowCodeDialog(true);
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Коды приглашения</h1>

      {/* Create code form */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Создать код приглашения
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="space-y-1 flex-1">
              <p className="text-xs text-muted-foreground">Код можно использовать только один раз</p>
              <Select value={generateRole} onValueChange={(v) => setGenerateRole(v as UserRole)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateCode}>
              <Plus className="h-4 w-4 mr-1" />
              Сгенерировать код
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes table */}
      {displayCodes.length === 0 ? (
        <EmptyState icon={Ticket} message="Нет кодов приглашения" />
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Кто использовал</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Дата использования</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayCodes.map(ic => (
                  <TableRow key={ic.id}>
                    <TableCell className="font-mono text-sm">{ic.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ic.role === "admin" ? "Админ" : ic.role === "moderator" ? "Модератор" : "Пользователь"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[ic.status].variant}>{statusConfig[ic.status].label}</Badge>
                    </TableCell>
                    <TableCell>
                      {ic.usedBy ? (
                        <div>
                          <p className="text-sm">{ic.usedBy.name}</p>
                          <p className="text-xs text-muted-foreground">{ic.usedBy.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{ic.createdAt}</TableCell>
                    <TableCell className="text-sm">{ic.usedAt || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {displayCodes.map(ic => (
              <Card key={ic.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-mono text-sm font-bold">{ic.code}</p>
                    <Badge variant={statusConfig[ic.status].variant} className="text-xs">{statusConfig[ic.status].label}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>Роль: <Badge variant="outline" className="text-xs">{ic.role === "admin" ? "Админ" : ic.role === "moderator" ? "Модератор" : "Пользователь"}</Badge></p>
                    {ic.usedBy && <p className="text-muted-foreground">Использовал: {ic.usedBy.name}</p>}
                    <p className="text-xs text-muted-foreground">Создан: {ic.createdAt}{ic.usedAt ? ` · Использован: ${ic.usedAt}` : ""}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Generated code dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Код приглашения создан</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Скопируйте код — он показывается только один раз:</p>
            <div className="bg-muted rounded-lg p-4 font-mono text-xl tracking-wider select-all">
              {generatedCode}
            </div>
            <Button onClick={copyCode} className="mt-4" variant="outline">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? "Скопировано!" : "Скопировать код"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
