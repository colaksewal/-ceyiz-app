import api from "../lib/api";
import type { CategoryTemplate, ProductSuggestion, ProductTemplate } from "../types";

export async function getTemplates(): Promise<CategoryTemplate[]> {
  const response = await api.get<CategoryTemplate[]>("/admin/templates");
  return response.data;
}

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

export async function suggestFromFile(file: File): Promise<ProductSuggestion | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<ProductSuggestion>("/admin/ai-suggestions", formData);
  return response.status === 204 ? null : response.data;
}
