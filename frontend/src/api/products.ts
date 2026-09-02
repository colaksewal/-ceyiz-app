import api from "../lib/api";
import type { Product } from "../types";

export async function getProducts(categoryId: string): Promise<Product[]> {
  const response = await api.get<Product[]>(`/categories/${categoryId}/products`);
  return response.data;
}

export async function createProduct(categoryId: string, name: string): Promise<Product> {
  const response = await api.post<Product>(`/categories/${categoryId}/products`, { name });
  return response.data;
}
