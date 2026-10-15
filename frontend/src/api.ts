import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
export const TOKEN_KEY = "auth_token";

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setToken = (t: string | null) => {
  token = t;
};
export const loadToken = async () => {
  token = (await storage.secureGet(TOKEN_KEY, null)) as string | null;
  return token;
};
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    const detail = Array.isArray(data?.detail) ? "Verifique os dados informados" : data?.detail;
    throw new Error(detail || "Algo deu errado. Tente novamente.");
  }
  return data as T;
}

export type User = { id: string; name: string; email: string; phone: string; role: "client" | "admin" };
export type SessionType = {
  id: string;
  name: string;
  description: string;
  duration_min: number;
  price: number;
  modality: "presencial" | "distancia";
  active: boolean;
};
export type Booking = {
  id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  session_name: string;
  modality: string;
  duration_min: number;
  price: number;
  date: string;
  time: string;
  notes: string;
  status: "pending" | "confirmed" | "cancelled";
};
