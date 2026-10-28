import api from "../lib/api";
import type { Product, ProductStatus } from "../types";

export async function getProducts(categoryId: string): Promise<Product[]> {
  const response = await api.get<Product[]>(`/categories/${categoryId}/products`);
  return response.data;
}

// Tek ürün: adı, linki, durumu ve setten geldiyse parçaları (ürün sayfasının kartı için).
export async function getProduct(productId: string): Promise<Product> {
  const response = await api.get<Product>(`/products/${productId}`);
  return response.data;
}

export async function createProduct(categoryId: string, name: string): Promise<Product> {
  const response = await api.post<Product>(`/categories/${categoryId}/products`, { name });
  return response.data;
}

export async function updateProduct(
  productId: string,
  changes: { name?: string; status?: ProductStatus; categoryId?: string; url?: string }
): Promise<Product> {
  const response = await api.patch<Product>(`/products/${productId}`, changes);
  return response.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await api.delete(`/products/${productId}`);
}
