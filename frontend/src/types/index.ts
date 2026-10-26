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
  // Alt kategoride üst kategorinin kimliği, üst kategoride null (sadece tek seviye).
  parentId: string | null;
}

// AI'nın bir kategori için önerdiği düzen (hiçbir şey yazılmadı): alt kategoriler ve aynı ürünler.
export interface OrganizeProduct {
  id: string;
  name: string;
}

export interface CategoryOrganizeSuggestion {
  groups: { name: string; products: OrganizeProduct[] }[];
  duplicates: OrganizeProduct[][];
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

// Liste özeti (GET /lists/{id}/summary). Atlanan ürünler toplamlara katılmaz.
export interface ListSummary {
  listName: string;
  weddingDate: string | null;
  generatedAt: string;
  totals: {
    productCount: number;
    purchasedCount: number;
    plannedCount: number;
    skippedCount: number;
    unpricedPlannedCount: number;
    purchasedTotal: number;
    remainingTotal: number;
  };
  categories: {
    name: string;
    productCount: number;
    purchasedCount: number;
    total: number;
    products: {
      name: string;
      status: ProductStatus;
      // Kullanılan fiyat notu; yoksa en ucuz not (preferred=false); hiç not yoksa null.
      price: {
        storeName: string | null;
        priceType: PriceType;
        total: number;
        installmentCount: number | null;
        installmentAmount: number | null;
        preferred: boolean;
      } | null;
      priceEntryCount: number;
    }[];
  }[];
  sets: { name: string; storeName: string | null; setPrice: number }[];
  members: { name: string; role: ShareRole }[];
}

// Kodla hesaplanan ödeme planı; aylar "2026-11" biçiminde.
export interface PaymentPlan {
  monthlyBudget: number;
  budgetProvided: boolean;
  suggestedMonthlyBudget: number;
  startMonth: string;
  weddingMonth: string | null;
  remainingTotal: number;
  plannedItemCount: number;
  unpricedItems: string[];
  unaffordableItems: string[];
  months: {
    month: string;
    purchases: {
      category: string;
      name: string;
      // Bu ay ödenen kısım; taksitliyse ilk taksit.
      amount: number;
      total: number;
      installmentCount: number | null;
    }[];
    ongoingInstallments: number;
    paid: number;
    savingsAfter: number;
  }[];
  finishMonth: string | null;
  finishesBeforeWedding: boolean | null;
  installmentsAfterWedding: number;
}

export interface PaymentPlanAdvice {
  summary: string | null;
  tips: string[];
}

export interface OnboardingStatus {
  hasList: boolean;
  hasCategory: boolean;
  hasProduct: boolean;
  hasPriceEntry: boolean;
  hasTeamMember: boolean;
  firstListId: string | null;
}



