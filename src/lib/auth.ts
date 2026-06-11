import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

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

        // Проверка пароля — сначала пробуем bcrypt, если не хеш — сравниваем напрямую (для старых паролей)
        let passwordMatch = false;
        try {
          // Если пароль выглядит как bcrypt-хеш ($2a$, $2b$)
          if (user.password.startsWith("$2")) {
            passwordMatch = await bcrypt.compare(credentials.password, user.password);
          } else {
            // Старый незашифрованный пароль — прямое сравнение
            passwordMatch = user.password === credentials.password;
          }
        } catch {
          passwordMatch = false;
        }

        if (!passwordMatch) {
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
