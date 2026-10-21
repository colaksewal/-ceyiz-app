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

export type PriceType = "PESIN" | "TAKSITLI" | "ELDEN_KREDI_KARTI";

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

export interface SetTemplateItem {
  id: string;
  itemName: string;
  quantity: number;
  displayOrder: number;
  // O ürünün setten ayrı alınırsa tamamının fiyatı (adetle çarpılmaz).
  estimatedSeparatePrice: number | null;
  note: string | null;
}

export interface SetTemplatePrice {
  id: string;
  storeName: string | null;
  priceType: PriceType;
  cashPrice: number | null;
  installmentCount: number | null;
  installmentAmount: number | null;
  paymentPlanNote: string | null;
  displayOrder: number;
}

// totalPieceCount / individualTotal / pricedItemCount backend'de parçalardan hesaplanır.
export interface SetTemplate {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  displayOrder: number;
  createdAt: string;
  createdByAdmin: boolean;
  // Kendi seti ya da (admin için) ortak set; sunucu hesaplar.
  canDelete: boolean;
  totalPieceCount: number;
  individualTotal: number;
  pricedItemCount: number;
  items: SetTemplateItem[];
  prices: SetTemplatePrice[];
}

export interface CreateSetTemplatePayload {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  displayOrder: number;
  items: Omit<SetTemplateItem, "id" | "displayOrder">[];
  prices: Omit<SetTemplatePrice, "id" | "displayOrder">[];
}

// AI'nın fotoğraf/PDF'den çıkardığı set; sadece formu doldurmak için kullanılır.
export interface SetTemplateSuggestion {
  name: string | null;
  brand: string | null;
  items: { itemName: string; quantity: number; estimatedSeparatePrice: number | null }[];
  prices: {
    priceType: PriceType;
    cashPrice: number | null;
    installmentCount: number | null;
    installmentAmount: number | null;
  }[];
}

export interface ProductSuggestion {
  categoryName: string;
  items: string[];
}



