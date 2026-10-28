import api from "../lib/api";
import type { Product, ProductStatus } from "../types";

export async function getProducts(categoryId: string): Promise<Product[]> {
  const response = await api.get<Product[]>(`/categories/${categoryId}/products`);
  return response.data;
}

export async function createProduct(categoryId: string, name: string, group?: string): Promise<Product> {
  const response = await api.post<Product>(`/categories/${categoryId}/products`, { name, group });
  return response.data;
}

export async function updateProduct(
  productId: string,
  changes: { name?: string; status?: ProductStatus; group?: string }
): Promise<Product> {
  const response = await api.patch<Product>(`/products/${productId}`, changes);
  return response.data;
}

// Grupsuz Mutfak ürünlerini sunucudaki kurallarla gruplar; eşleşmeyenler grupsuz kalır.
export async function autoGroupProducts(categoryId: string): Promise<Product[]> {
  const response = await api.post<Product[]>(`/categories/${categoryId}/products/auto-group`);
  return response.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await api.delete(`/products/${productId}`);
}
