import { compare } from "bcrypt-ts";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db, schema } from "@/lib/db";
import { generateHashedPassword } from "@/lib/db/utils";

export type UserType = "guest" | "regular";

export interface AuthSession {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    type?: UserType;
  };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password: string) => Promise.resolve(generateHashedPassword(password)),
      verify: (data: { password: string; hash: string }) =>
        compare(data.password, data.hash),
    },
  },
  user: {
    additionalFields: {
      type: {
        type: ["guest", "regular"],
        required: true,
        defaultValue: "regular",
        input: true,
      },
    },
  },
  basePath: "/api/auth",
  plugins: [nextCookies()],
});

export async function authSession() {
  return auth.api.getSession({ headers: await headers() });
}
