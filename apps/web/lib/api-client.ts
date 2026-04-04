const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  setRefreshToken(token: string) {
    this.refreshToken = token;
  }

  clearToken() {
    this.token = null;
    this.refreshToken = null;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      // Try to refresh token
      const refreshed = await this._tryRefresh();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.token}`;
        const retryRes = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
          credentials: "include",
        });
        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({}));
          throw { statusCode: retryRes.status, ...err };
        }
        return retryRes.json() as Promise<T>;
      }
      throw { statusCode: 401, code: "UNAUTHORIZED" };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { statusCode: res.status, ...err };
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private async _tryRefresh(): Promise<boolean> {
    try {
      // Refresh token is in HttpOnly cookie (auto-sent with credentials: "include")
      // Also send body as fallback for backward compat
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.refreshToken ? { refreshToken: this.refreshToken } : {}),
      });
      if (!res.ok) return false;
      const data = await res.json() as { accessToken: string };
      this.token = data.accessToken;
      return true;
    } catch {
      return false;
    }
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { statusCode: res.status, ...err };
    }
    return res.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();
