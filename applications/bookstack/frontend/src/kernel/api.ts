export interface ApiResult<T = any> { ok: boolean; status: number; data: T }

/** Call a same-origin JSON API. Never throws on HTTP errors; network errors surface as status 0. */
export async function api<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: options.method ?? (options.body === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: { error: String(error) } as any };
  }
}
