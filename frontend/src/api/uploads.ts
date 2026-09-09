import api from "../lib/api";

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<{ url: string }>("/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.url;
}

// Backend "/uploads/xxx.jpg" gibi kök-göreceli bir path döner (VITE_API_BASE_URL'in
// "/api" son ekiyle aynı origin'den, ama /api altında değil). Tarayıcıda göstermek için
// origin'i (host+port) ekleyip tam bir URL'e çeviriyoruz.
export function resolveUploadUrl(path: string): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string;
  const origin = apiBaseUrl.replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
