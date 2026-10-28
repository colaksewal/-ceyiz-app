import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getAdminProposals, publishProposal, rejectProposal } from "../api/templateProposals";
import { useAuthStore } from "../store/authStore";
import type { ProposalCategory, PublishProposalResult, TemplateProposal } from "../types";
import styles from "./AdminProposalsPage.module.scss";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels: Record<TemplateProposal["status"], string> = {
  PENDING: "Bekliyor",
  PUBLISHED: "Yayınlandı",
  REJECTED: "Reddedildi",
};

// İncelemede düzenlenebilen taslak: kategori/ürün açılıp kapanır, kategori yeniden adlandırılır.
interface DraftProduct {
  name: string;
  on: boolean;
}
interface DraftCategory {
  name: string;
  on: boolean;
  products: DraftProduct[];
  children: DraftCategory[];
}

function toDraft(categories: ProposalCategory[]): DraftCategory[] {
  return categories.map((category) => ({
    name: category.name,
    on: true,
    products: category.products.map((name) => ({ name, on: true })),
    children: toDraft(category.children ?? []),
  }));
}

// Kapatılan kategori/ürünler çıkarılır. Ürünü paylaşılmamış (sadece adı gelen) kategori de yayınlanır.
function toPayload(drafts: DraftCategory[]): ProposalCategory[] {
  return drafts
    .filter((category) => category.on && category.name.trim() !== "")
    .map((category) => ({
      name: category.name.trim(),
      products: category.products.filter((product) => product.on).map((product) => product.name),
      children: toPayload(category.children),
    }));
}

// Yayınlanacak kategori ve ürün sayısı.
function countOn(drafts: DraftCategory[]): { categories: number; products: number } {
  return drafts
    .filter((category) => category.on)
    .reduce(
      (sum, category) => {
        const nested = countOn(category.children);
        return {
          categories: sum.categories + 1 + nested.categories,
          products: sum.products + category.products.filter((product) => product.on).length + nested.products,
        };
      },
      { categories: 0, products: 0 }
    );
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return fallback;
}

// Admin: kullanıcıların "şablon olarak öner" ile gönderdiği listeleri inceler. Kategori ve ürünleri açıp
// kapatarak/yeniden adlandırarak düzenleyip yayınlar (ortak şablonlara eklenir) ya da reddeder.
export default function AdminProposalsPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [filter, setFilter] = useState<"PENDING" | "ALL">("PENDING");

  const { data: proposals, isLoading, error } = useQuery({
    queryKey: ["adminProposals", filter],
    queryFn: () => getAdminProposals(filter),
    enabled: isAdmin,
  });

  if (!isAdmin) return <Navigate to="/lists" replace />;

  return (
    <div>
      <h1>Şablon önerileri</h1>
      <p className={styles.intro}>
        Kullanıcıların listelerinden gönderdiği şablon önerileri. Yayınlarsan "Şablonlardan getir"de herkese görünür.
      </p>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "PENDING"}
          className={`${styles.tab} ${filter === "PENDING" ? styles.tabActive : ""}`}
          onClick={() => setFilter("PENDING")}
        >
          Bekleyenler
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "ALL"}
          className={`${styles.tab} ${filter === "ALL" ? styles.tabActive : ""}`}
          onClick={() => setFilter("ALL")}
        >
          Tümü
        </button>
      </div>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Öneriler yüklenemedi</p>}
      {proposals && proposals.length === 0 && (
        <p className="empty-state">{filter === "PENDING" ? "Bekleyen öneri yok." : "Henüz öneri yok."}</p>
      )}

      <div className="stack">
        {proposals?.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: TemplateProposal }) {
  const queryClient = useQueryClient();
  const pending = proposal.status === "PENDING";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftCategory[]>(() => toDraft(proposal.categories));
  const [rejecting, setRejecting] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [result, setResult] = useState<PublishProposalResult | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["adminProposals"] });
    queryClient.invalidateQueries({ queryKey: ["pendingProposals"] });
  }

  const publishMutation = useMutation({
    mutationFn: () => publishProposal(proposal.id, toPayload(draft)),
    onSuccess: (published) => {
      setResult(published);
      // Ortak şablonlar değişti: şablon seçici ve admin şablon ekranı yenilensin.
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      refresh();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectProposal(proposal.id, adminNote.trim() || null),
    onSuccess: refresh,
  });

  function updateCategory(path: number[], patch: Partial<DraftCategory>) {
    setDraft((prev) => updateAt(prev, path, (category) => ({ ...category, ...patch })));
  }

  function toggleProduct(path: number[], productIndex: number) {
    setDraft((prev) =>
      updateAt(prev, path, (category) => ({
        ...category,
        products: category.products.map((product, i) => (i === productIndex ? { ...product, on: !product.on } : product)),
      }))
    );
  }

  const selected = countOn(draft);

  return (
    <section className={`card ${styles.card}`}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{proposal.title}</h3>
          <p className={styles.meta}>
            {proposal.submittedByName} · {dateFormatter.format(new Date(proposal.createdAt))} · {proposal.productCount} ürün
          </p>
        </div>
        <span className={`${styles.status} ${styles[`status${proposal.status}`]}`}>{statusLabels[proposal.status]}</span>
      </div>

      {proposal.note && <p className={styles.note}>“{proposal.note}”</p>}
      {proposal.adminNote && <p className={styles.note}>Admin notu: {proposal.adminNote}</p>}

      <button type="button" className="btn btn-ghost" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? "▾ Gizle" : pending ? "▸ İncele ve düzenle" : "▸ İçeriği gör"}
      </button>

      {open && (
        <div className={styles.tree}>
          {draft.map((category, index) => (
            <CategoryEditor
              key={index}
              category={category}
              path={[index]}
              editable={pending}
              onCategory={updateCategory}
              onProduct={toggleProduct}
            />
          ))}
        </div>
      )}

      {result && (
        <p className={styles.success}>
          ✓ Yayınlandı: {result.addedCategories} yeni kategori, {result.addedProducts} yeni ürün şablonlara eklendi.
        </p>
      )}
      {publishMutation.isError && (
        <p className="error-text">{errorMessage(publishMutation.error, "Yayınlanamadı, tekrar dene.")}</p>
      )}
      {rejectMutation.isError && (
        <p className="error-text">{errorMessage(rejectMutation.error, "Reddedilemedi, tekrar dene.")}</p>
      )}

      {pending && !result && (
        <div className={styles.actions}>
          {rejecting ? (
            <>
              <input
                type="text"
                placeholder="Kullanıcıya not (opsiyonel)"
                maxLength={2000}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
              <button type="button" className="btn btn-ghost" onClick={() => setRejecting(false)}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn-danger-ghost"
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
              >
                {rejectMutation.isPending ? "..." : "Reddet"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-danger-ghost" onClick={() => setRejecting(true)}>
                Reddet
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={publishMutation.isPending || selected.categories === 0}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? "Yayınlanıyor..." : `Herkese yayınla (${selected.categories} kategori, ${selected.products} ürün)`}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// Yolu (kategori sırası, sonra alt kategori sırası) izleyerek değişmez güncelleme yapar.
function updateAt(
  list: DraftCategory[],
  path: number[],
  change: (category: DraftCategory) => DraftCategory
): DraftCategory[] {
  const [head, ...rest] = path;
  return list.map((category, i) => {
    if (i !== head) return category;
    return rest.length === 0 ? change(category) : { ...category, children: updateAt(category.children, rest, change) };
  });
}

function CategoryEditor({
  category,
  path,
  editable,
  onCategory,
  onProduct,
}: {
  category: DraftCategory;
  path: number[];
  editable: boolean;
  onCategory: (path: number[], patch: Partial<DraftCategory>) => void;
  onProduct: (path: number[], productIndex: number) => void;
}) {
  const nested = path.length > 1;
  return (
    <div className={`${styles.category} ${nested ? styles.nested : ""} ${category.on ? "" : styles.off}`}>
      <div className={styles.categoryHead}>
        {editable && (
          <input
            type="checkbox"
            aria-label={`${category.name} kategorisini yayınla`}
            checked={category.on}
            onChange={() => onCategory(path, { on: !category.on })}
          />
        )}
        {editable ? (
          <input
            type="text"
            className={styles.nameInput}
            aria-label="Kategori adı"
            maxLength={255}
            value={category.name}
            disabled={!category.on}
            onChange={(e) => onCategory(path, { name: e.target.value })}
          />
        ) : (
          <strong>{category.name}</strong>
        )}
        <span className="muted">
          {category.products.length === 0 ? "ürünler paylaşılmadı" : `${category.products.length} ürün`}
        </span>
      </div>

      <div className={styles.chips}>
        {category.products.map((product, index) =>
          editable ? (
            <button
              key={index}
              type="button"
              className={`${styles.chip} ${product.on && category.on ? styles.chipOn : ""}`}
              aria-pressed={product.on}
              disabled={!category.on}
              onClick={() => onProduct(path, index)}
            >
              {product.on ? "✓ " : "+ "}
              {product.name}
            </button>
          ) : (
            <span key={index} className={styles.chip}>
              {product.name}
            </span>
          )
        )}
      </div>

      {category.children.map((child, index) => (
        <CategoryEditor
          key={index}
          category={child}
          path={[...path, index]}
          editable={editable}
          onCategory={onCategory}
          onProduct={onProduct}
        />
      ))}
    </div>
  );
}
