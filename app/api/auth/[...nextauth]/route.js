// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Demo Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Demo login - in production, verify against your database
        if (credentials?.email && credentials?.password) {
          return {
            id: "1",
            name: credentials.email.split("@")[0],
            email: credentials.email,
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: "/auth/signin",
  },
  // Optional: Add custom session/jwt callbacks here if you need user IDs attached to sessions
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };