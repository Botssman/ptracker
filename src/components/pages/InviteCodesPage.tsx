"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { Plus, Copy, Check, KeyRound, Ticket } from "lucide-react";

interface InviteCodeData {
  id: number;
  code: string;
  role: string;
  status: string;
  usedById: number | null;
  usedBy: { name: string; email: string } | null;
  createdAt: string;
  usedAt: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  UNUSED: { label: "Не использован", variant: "default" },
  USED: { label: "Использован", variant: "secondary" },
  EXPIRED: { label: "Просрочен", variant: "outline" },
};

export function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateRole, setGenerateRole] = useState("USER");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchCodes() {
      try {
        const data = await apiFetch<InviteCodeData[]>("/api/invite-codes");
        setCodes(data);
      } catch (err) {
        console.error("Failed to fetch invite codes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCodes();
  }, []);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const result = await apiFetch<InviteCodeData>("/api/invite-codes", {
        method: "POST",
        body: JSON.stringify({ role: generateRole }),
      });
      setGeneratedCode(result.code);
      setShowCodeDialog(true);
      // Refresh list
      const data = await apiFetch<InviteCodeData[]>("/api/invite-codes");
      setCodes(data);
    } catch (err) {
      console.error("Failed to generate code:", err);
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Коды приглашения</h1>
        <LoadingState type="table" count={4} />
      </div>
    );
  }

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
              <Select value={generateRole} onValueChange={setGenerateRole}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Пользователь</SelectItem>
                  <SelectItem value="MODERATOR">Модератор</SelectItem>
                  <SelectItem value="ADMIN">Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateCode} disabled={generating}>
              <Plus className="h-4 w-4 mr-1" />
              {generating ? "Генерация..." : "Сгенерировать код"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes table */}
      {codes.length === 0 ? (
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
                {codes.map(ic => (
                  <TableRow key={ic.id}>
                    <TableCell className="font-mono text-sm">{ic.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ic.role === "ADMIN" ? "Админ" : ic.role === "MODERATOR" ? "Модератор" : "Пользователь"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(statusConfig[ic.status] || statusConfig.UNUSED).variant}>
                        {(statusConfig[ic.status] || statusConfig.UNUSED).label}
                      </Badge>
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
                    <TableCell className="text-sm">{new Date(ic.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                    <TableCell className="text-sm">{ic.usedAt ? new Date(ic.usedAt).toLocaleDateString("ru-RU") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {codes.map(ic => (
              <Card key={ic.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-mono text-sm font-bold">{ic.code}</p>
                    <Badge variant={(statusConfig[ic.status] || statusConfig.UNUSED).variant} className="text-xs">
                      {(statusConfig[ic.status] || statusConfig.UNUSED).label}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>Роль: <Badge variant="outline" className="text-xs">{ic.role === "ADMIN" ? "Админ" : ic.role === "MODERATOR" ? "Модератор" : "Пользователь"}</Badge></p>
                    {ic.usedBy && <p className="text-muted-foreground">Использовал: {ic.usedBy.name}</p>}
                    <p className="text-xs text-muted-foreground">
                      Создан: {new Date(ic.createdAt).toLocaleDateString("ru-RU")}
                      {ic.usedAt ? ` · Использован: ${new Date(ic.usedAt).toLocaleDateString("ru-RU")}` : ""}
                    </p>
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
