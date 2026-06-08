"use client";

import { useState } from "react";
import { useRouterContext } from "@/lib/router-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ValidationErrors, FieldError } from "@/components/shared/ValidationErrors";
import { UserPlus } from "lucide-react";

export function RegisterPage() {
  const { routeParams, navigate } = useRouterContext();
  const code = (routeParams.code as string) || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Введите имя";
    if (!email.trim()) newErrors.email = "Введите email";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Неверный формат email";
    if (!password) newErrors.password = "Введите пароль";
    else if (password.length < 6) newErrors.password = "Пароль должен быть не менее 6 символов";
    if (password !== confirmPassword) newErrors.confirmPassword = "Пароли не совпадают";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("groups");
    }, 800);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3 w-fit">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Регистрация</CardTitle>
          <CardDescription>
            {code ? (
              <>Вы регистрируетесь по коду: <span className="font-mono font-bold text-primary">{code}</span></>
            ) : (
              "Создайте аккаунт для доступа к системе"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ValidationErrors errors={errors} className="mb-4" />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Имя</Label>
              <Input id="reg-name" placeholder="Иван Петров" value={name} onChange={(e) => setName(e.target.value)} />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" placeholder="ivan@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Пароль</Label>
              <Input id="reg-password" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              <FieldError message={errors.password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">Подтверждение пароля</Label>
              <Input id="reg-confirm" type="password" placeholder="••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <FieldError message={errors.confirmPassword} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <button type="button" className="text-primary underline hover:no-underline" onClick={() => navigate("login")}>
                Войти
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
