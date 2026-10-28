import type { UserRole } from "@delivery/db";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roles?: UserRole[];
  }
  interface Session {
    user: { id: string; roles: UserRole[] } & DefaultSession["user"];
  }
}
