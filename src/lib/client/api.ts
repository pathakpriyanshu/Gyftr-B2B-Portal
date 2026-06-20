"use client";

import type { ApiResult } from "@/types";

/** Typed fetch wrapper. Throws ApiClientError on non-ok responses. */
export class ApiClientError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  let json: ApiResult<T> | null = null;
  try {
    json = (await res.json()) as ApiResult<T>;
  } catch {
    /* non-json response */
  }

  if (!res.ok || !json || json.ok === false) {
    const message =
      (json && json.ok === false && json.error) || `Request failed (${res.status})`;
    const code = json && json.ok === false ? json.code : undefined;
    throw new ApiClientError(message, res.status, code);
  }
  return json.data;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(url: string, form: FormData) =>
    request<T>(url, { method: "POST", body: form }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
