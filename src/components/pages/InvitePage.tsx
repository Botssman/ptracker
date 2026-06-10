"use client";

import { useState } from "react";
import { useRouterContext } from "@/lib/router-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FieldError } from "@/components/shared/ValidationErrors";
import { KeyRound } from "lucide-react";

export function InvitePage() {
  const { navigate } = useRouterContext();
  const { validateInviteCode } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Введите код приглашения");
      return;
    }

    setLoading(true);
    try {
      const result = await validateInviteCode(code.trim());
      if (!result.valid) {
        setError("Недействительный код приглашения");
        setLoading(false);
        return;
      }
      navigate("register", { code: code.trim(), codeRole: result.role || "" });
    } catch {
      setError("Ошибка проверки кода");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3 w-fit">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Регистрация по коду приглашения</CardTitle>
          <CardDescription>Введите код, который вы получили от администратора</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Код приглашения</Label>
              <Input
                id="invite-code"
                placeholder="ABCD-1234-EFGH"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(""); }}
                className="text-center font-mono text-lg tracking-wider"
              />
              <FieldError message={error} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Проверка..." : "Продолжить"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
