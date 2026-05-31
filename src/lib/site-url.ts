export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (url) return url;
  if (process.env.NODE_ENV === "production") return "https://www.vayasa.co.za";
  return "http://localhost:3000";
}
