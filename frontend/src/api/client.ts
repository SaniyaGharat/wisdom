import type { ErrorResponse } from './types';

// API Base URL from environment or default to local FastAPI server
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  public status_code: number;
  public error: string;
  public detail: string;
  public errors?: Array<{ field: string; message: string; type: string }> | null;

  constructor(errorResponse: ErrorResponse) {
    super(errorResponse.detail || errorResponse.error || 'API Request Failed');
    this.name = 'ApiError';
    this.status_code = errorResponse.status_code;
    this.error = errorResponse.error;
    this.detail = errorResponse.detail;
    this.errors = errorResponse.errors;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers: defaultHeaders,
    });

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errResponse: ErrorResponse = data || {
        error: response.statusText || 'Error',
        detail: `Request failed with HTTP status ${response.status}`,
        status_code: response.status,
      };
      throw new ApiError(errResponse);
    }

    return data as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors or unexpected exceptions
    throw new ApiError({
      error: 'Network Error',
      detail:
        error.message ||
        'Unable to connect to the backend server. Please verify FastAPI is running at ' +
          API_BASE_URL,
      status_code: 0,
    });
  }
}
