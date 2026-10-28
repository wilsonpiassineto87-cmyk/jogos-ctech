import { guard, requireRole } from "@/lib/authz";

export default async function RestaurantRootLayout({ children }: { children: React.ReactNode }) {
  await guard(() => requireRole("MERCHANT"), "/restaurant");
  return children;
}
