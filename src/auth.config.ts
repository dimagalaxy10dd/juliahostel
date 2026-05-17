import type { NextAuthConfig } from "next-auth";

// Edge-безопасная часть конфигурации (используется в middleware).
// Здесь НЕТ Prisma и bcrypt — они только в auth.ts.
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const loggedIn = !!auth?.user;
      const isLogin = nextUrl.pathname.startsWith("/login");
      if (isLogin) {
        if (loggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id ?? token.sub;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      if (typeof token.role === "string") session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
