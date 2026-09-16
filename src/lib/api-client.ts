import { supabase } from "./supabase-browser";

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  let { data, error } = await supabase.auth.getSession();
  if ((error || !data.session) && typeof window !== "undefined") {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const retry = await supabase.auth.getSession();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data.session)
    throw new RequestError("Accedi per continuare.", 401, "UNAUTHORIZED");
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  // Callers cannot replace the account token with the former local host token.
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok)
    throw new RequestError(
      body.error || "Operazione non riuscita.",
      response.status,
      body.code || "",
    );
  return body as T;
}
