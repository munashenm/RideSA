export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T | null; status: number; ok: boolean }> {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { data: null, status: res.status, ok: res.ok };
  }

  try {
    const data = (await res.json()) as T;
    return { data, status: res.status, ok: res.ok };
  } catch {
    return { data: null, status: res.status, ok: false };
  }
}
