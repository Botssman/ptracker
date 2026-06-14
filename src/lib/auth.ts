import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        if (user.isBlocked) {
          return null;
        }

        // Проверка пароля через bcrypt
        // Поддержка обратной совместимости: если пароль не похож на хеш, пробуем прямое сравнение
        let passwordValid = false;
        try {
          if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
            // Пароль захеширован bcrypt — проверяем через compare
            passwordValid = await bcrypt.compare(credentials.password, user.password);
          } else {
            // Старый формат (открытый текст) — прямое сравнение + автоматическая миграция
            if (user.password === credentials.password) {
              passwordValid = true;
              // Автоматически хешируем пароль при следующем входе
              const hashedPassword = await bcrypt.hash(credentials.password, 10);
              await db.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
              });
            }
          }
        } catch {
          passwordValid = false;
        }

        if (!passwordValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.userId = (user as { id: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
};

export default NextAuth(authOptions);
