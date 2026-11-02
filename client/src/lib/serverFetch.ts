import { cookies } from "next/headers";
import type { User } from "@/types/api";

// Le compte connecté, lu côté serveur (layouts de /compte et /admin). Le cookie
// httpOnly n'est pas lisible en JavaScript dans le navigateur, mais le serveur
// de Next le reçoit avec la requête et le transmet à l'API.
export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(`${process.env.API_URL}/auth/me`, {
      headers: { Cookie: `token=${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    return ((await response.json()) as { data: User }).data;
  } catch {
    return null;
  }
}
