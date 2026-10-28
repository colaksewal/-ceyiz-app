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

export interface ListProductPath {
  productId: string;
  productName: string;
  // "Mutfak › Pişirme › Çelik tencere seti"
  path: string;
}

// Listedeki tüm ürünler, kategori yoluyla (üst › alt › ürün); ürün seçmek için.
export async function getListProductPaths(listId: string): Promise<ListProductPath[]> {
  const categories = await getCategories(listId);
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const perCategory = await Promise.all(
    categories.map(async (category) => {
      const products = await getProducts(category.id);
      const prefix =
        category.parentId && names.has(category.parentId)
          ? `${names.get(category.parentId)} › ${category.name}`
          : category.name;
      return products.map((product) => ({
        productId: product.id,
        productName: product.name,
        path: `${prefix} › ${product.name}`,
      }));
    })
  );
  return perCategory.flat().sort((a, b) => a.path.localeCompare(b.path, "tr"));
}
