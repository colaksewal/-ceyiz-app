import api from "../lib/api";
import type { CategoryTemplate, ProductTemplate } from "../types";

export async function createCategoryTemplate(name: string, displayOrder: number): Promise<CategoryTemplate> {
  const response = await api.post<CategoryTemplate>("/admin/templates/categories", { name, displayOrder });
  return response.data;
}

export async function deleteCategoryTemplate(categoryTemplateId: string): Promise<void> {
  await api.delete(`/admin/templates/categories/${categoryTemplateId}`);
}

export async function createProductTemplate(
  categoryTemplateId: string,
  name: string,
  displayOrder: number
): Promise<ProductTemplate> {
  const response = await api.post<ProductTemplate>(
    `/admin/templates/categories/${categoryTemplateId}/products`,
    { name, displayOrder }
  );
  return response.data;
}

export async function deleteProductTemplate(productTemplateId: string): Promise<void> {
  await api.delete(`/admin/templates/products/${productTemplateId}`);
}
