"use client";

import { useState } from "react";
import { useRouterContext } from "@/lib/router-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ValidationErrors, FieldError } from "@/components/shared/ValidationErrors";
import { LogIn } from "lucide-react";

export function LoginPage() {
  const { navigate } = useRouterContext();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!email.trim()) newErrors.email = "Введите email";
    if (!password) newErrors.password = "Введите пароль";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigate based on role - will be handled by auth context
      navigate("groups");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Ошибка входа" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3 w-fit">
            <LogIn className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>Войдите в свой аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <ValidationErrors errors={errors} className="mb-4" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input id="login-email" type="email" placeholder="ivan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Пароль</Label>
              <Input id="login-password" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              <FieldError message={errors.password} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Запомнить меня</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </Button>
            <div className="flex flex-col gap-1 text-center text-sm text-muted-foreground">
              <button type="button" className="text-primary underline hover:no-underline" onClick={() => navigate("invite")}>
                Нет аккаунта? Зарегистрируйтесь по коду
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
