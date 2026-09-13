import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { ApiError } from "./api-error";

export type AuthContext = { client: SupabaseClient; user: User };

export async function requireUser(request: Request): Promise<AuthContext> {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i);
  if (!match) throw new ApiError("UNAUTHORIZED", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError("SERVER_CONFIG", 503);
  const token = match[1];
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous)
    throw new ApiError("UNAUTHORIZED", 401);
  return { client, user: data.user };
}
