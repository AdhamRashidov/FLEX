import type { ApiResponse, ApiError, Pagination } from '@flex/shared';

const BASE_URL = '/api/v1';

export interface PaginatedData<T> {
  items: T[];
  pagination?: Pagination;
}

class AdminApiClient {
  private token: string | null = null;
  private storeId: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('flex_admin_token');
      const savedStore = localStorage.getItem('flex_admin_store_id');
      this.storeId = savedStore ? Number(savedStore) : null;
    }
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('flex_admin_token', token);
    } else {
      localStorage.removeItem('flex_admin_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setStoreId(storeId: number | null): void {
    this.storeId = storeId;
    if (storeId) {
      localStorage.setItem('flex_admin_store_id', String(storeId));
    } else {
      localStorage.removeItem('flex_admin_store_id');
    }
  }

  public getStoreId(): number | null {
    return this.storeId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (this.storeId) {
      headers['X-Store-Id'] = String(this.storeId);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        const errorData = json as ApiError;
        const errorMessage = errorData.error?.message || `HTTP Xatosi: ${response.status}`;
        throw new Error(errorMessage);
      }

      return json as ApiResponse<T>;
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Noma\'lum tarmoq xatoligi yuz berdi');
    }
  }

  public async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const res = await this.getRaw<T>(endpoint, params);
    return res.data;
  }

  public async getWithMeta<T>(endpoint: string, params?: Record<string, unknown>): Promise<{ data: T; pagination?: Pagination }> {
    const res = await this.getRaw<T>(endpoint, params);
    return { data: res.data, pagination: res.meta?.pagination };
  }

  private async getRaw<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.data;
  }

  public async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const res = await this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.data;
  }

  public async delete<T>(endpoint: string): Promise<T> {
    const res = await this.request<T>(endpoint, { method: 'DELETE' });
    return res.data;
  }

  public async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.storeId) {
      headers['X-Store-Id'] = String(this.storeId);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || 'Fayl yuklashda xatolik');
    }
    return json.data as T;
  }
}

export const adminApi = new AdminApiClient();
