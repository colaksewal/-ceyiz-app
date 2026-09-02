import api from "../lib/api";

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<void> {
  await api.post("/auth/register", payload);
}

export async function login(payload: LoginPayload): Promise<string> {
  const response = await api.post<string>("/auth/login", payload, {
    responseType: "text",
    transformResponse: (data) => data,
  });
  return response.data;
}
