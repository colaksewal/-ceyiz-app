export type ShareRole = "OWNER" | "EDITOR" | "VIEWER";

export interface TrousseauListItem {
  id: string;
  name: string;
  weddingDate: string | null;
  createdAt: string;
  role: ShareRole;
}

export interface ListShare {
  shareId: string | null;
  userId: string;
  email: string;
  name: string;
  role: ShareRole;
}

export interface Category {
  id: string;
  name: string;
}

export type ProductStatus = "PLANNED" | "PURCHASED" | "SKIPPED";

export interface Product {
  id: string;
  name: string;
  status: ProductStatus;
}

// Note: "TAKTILI" matches the backend enum value verbatim (upstream typo for "TAKSİTLİ").
export type PriceType = "PESIN" | "TAKTILI" | "ELDEN_KREDI_KARTI";

export interface PriceEntry {
  id: string;
  productId: string;
  storeName: string;
  priceType: PriceType;
  cashPrice: number | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  paymentPlanNote: string | null;
  photoUrl: string | null;
  visitedAt: string;
  isPreferred: boolean;
}

export interface ProductSet {
  id: string;
  name: string;
  storeName: string;
  setPrice: number;
}

export interface SetItem {
  productId: string | null;
  itemName: string;
  quantity: number;
  estimatedIndividualPrice: number | null;
}

export interface SetComparisonResult {
  setPrice: number;
  individualTotal: number;
  savingsAmount: number;
  missingItemsCount: number;
}

export interface ProductTemplate {
  id: string;
  name: string;
  displayOrder: number;
}

export interface CategoryTemplate {
  id: string;
  name: string;
  displayOrder: number;
  products: ProductTemplate[];
}



