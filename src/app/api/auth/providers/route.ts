export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/settings",
      {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) throw new Error("Unavailable");
    const settings = await response.json();
    return Response.json({
      google: settings.external?.google === true,
      apple: settings.external?.apple === true,
    });
  } catch {
    return Response.json({ google: false, apple: false });
  }
}
