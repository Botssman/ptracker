// API client wrapper with auth headers and error handling

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Redirect to login - handled by auth context
    throw new ApiError("Не авторизован", 401);
  }

  if (res.status === 403) {
    throw new ApiError("Доступ запрещён", 403);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      (data as { error?: string }).error || "Ошибка сервера",
      res.status,
      data
    );
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function apiUpload<T>(
  url: string,
  formData: FormData
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    body: formData,
    // Don't set Content-Type - browser will set it with boundary for FormData
  });

  if (res.status === 401) {
    throw new ApiError("Не авторизован", 401);
  }

  if (res.status === 403) {
    throw new ApiError("Доступ запрещён", 403);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      (data as { error?: string }).error || "Ошибка сервера",
      res.status,
      data
    );
  }

  return res.json();
}
