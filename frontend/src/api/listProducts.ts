import { getCategories } from "./categories";
import { getProducts } from "./products";

export interface ListProductOption {
  productId: string;
  productName: string;
  categoryName: string;
}

export async function getListProductOptions(listId: string): Promise<ListProductOption[]> {
  const categories = await getCategories(listId);
  const perCategory = await Promise.all(
    categories.map(async (category) => {
      const products = await getProducts(category.id);
      return products.map((product) => ({
        productId: product.id,
        productName: product.name,
        categoryName: category.name,
      }));
    })
  );
  return perCategory.flat();
}
