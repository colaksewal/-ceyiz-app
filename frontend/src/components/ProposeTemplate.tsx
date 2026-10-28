import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getMyLists } from "../api/lists";
import { getMyProposals, proposeTemplate } from "../api/templateProposals";
import type { Category, TemplateProposal } from "../types";
import styles from "./ProposeTemplate.module.scss";

const statusLabels: Record<TemplateProposal["status"], string> = {
  PENDING: "İnceleniyor",
  PUBLISHED: "Yayınlandı",
  REJECTED: "Reddedildi",
};

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === "string") {
    return error.response.data.error;
  }
  return "Öneri gönderilemedi, tekrar dene.";
}

// Her kategori için seçim: öneriye girsin mi (on) ve içindeki ürün adları da paylaşılsın mı (products).
interface Choice {
  on: boolean;
  products: boolean;
}

const DEFAULT_CHOICE: Choice = { on: true, products: true };

// Kullanıcı listesinden SEÇTİĞİ kategorileri şablon olarak önerir. Her kategoride "içindeki ürünleri paylaş"
// kapatılırsa sadece kategorinin adı gider, ürün adları gitmez. Fiyat, mağaza ve link hiçbir durumda gitmez.
// Admin inceler, düzenleyip herkesin kullandığı şablonlara ekler ya da reddeder.
export default function ProposeTemplate({ listId, categories }: { listId: string; categories: Category[] }) {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getMyLists });
  const listName = lists?.find((list) => list.id === listId)?.name ?? "";
  const [title, setTitle] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [sent, setSent] = useState<TemplateProposal | null>(null);

  const { data: mine } = useQuery({ queryKey: ["myProposals"], queryFn: getMyProposals });

  const tops = categories.filter((category) => category.parentId === null);
  const subsOf = (id: string) => categories.filter((category) => category.parentId === id);
  const choiceOf = (id: string): Choice => choices[id] ?? DEFAULT_CHOICE;
  // Alt kategori, ancak üst kategorisi de seçiliyse öneriye girer.
  const included = (category: Category): boolean =>
    choiceOf(category.id).on && (category.parentId === null || choiceOf(category.parentId).on);

  const selected = categories.filter(included);
  const sharedProducts = selected
    .filter((category) => choiceOf(category.id).products)
    .reduce((sum, category) => sum + category.productCount, 0);
  const titleValue = title ?? listName;

  function update(id: string, patch: Partial<Choice>) {
    setChoices((prev) => ({ ...prev, [id]: { ...(prev[id] ?? DEFAULT_CHOICE), ...patch } }));
    setSent(null);
  }

  const mutation = useMutation({
    mutationFn: () =>
      proposeTemplate({
        listId,
        title: titleValue.trim(),
        note: note.trim() || null,
        categories: selected.map((category) => ({
          categoryId: category.id,
          includeProducts: choiceOf(category.id).products,
        })),
      }),
    onSuccess: (proposal) => {
      setSent(proposal);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["myProposals"] });
      queryClient.invalidateQueries({ queryKey: ["pendingProposals"] });
    },
  });

  function renderChoice(category: Category, nested: boolean) {
    const choice = choiceOf(category.id);
    const parentOff = category.parentId !== null && !choiceOf(category.parentId).on;
    return (
      <div key={category.id} className={`${styles.cat} ${nested ? styles.nested : ""} ${parentOff ? styles.off : ""}`}>
        <label className={styles.catRow}>
          <input
            type="checkbox"
            checked={choice.on && !parentOff}
            disabled={parentOff}
            onChange={() => update(category.id, { on: !choice.on })}
          />
          <span className={styles.catName}>{category.name}</span>
          <span className="muted">{category.productCount} ürün</span>
        </label>
        {choice.on && !parentOff && (
          <label className={styles.shareRow}>
            <input
              type="checkbox"
              checked={choice.products}
              onChange={() => update(category.id, { products: !choice.products })}
            />
            <span>İçindeki ürünleri paylaş</span>
          </label>
        )}
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <p className={styles.hint}>
        Önermek istediğin kategorileri seç. "İçindeki ürünleri paylaş"ı kapatırsan sadece kategorinin adı gider, ürün
        adların gitmez. Fiyat, mağaza ve link hiçbir durumda gitmez. Admin inceleyip uygun görürse herkesin
        kullanabileceği şablonlara ekler.
      </p>

      {tops.length === 0 ? (
        <p className="muted">Listede henüz kategori yok; önce kategori ekle.</p>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (!titleValue.trim() || selected.length === 0) return;
            setSent(null);
            mutation.mutate();
          }}
        >
          <div className={styles.tree}>
            {tops.map((top) => (
              <div key={top.id}>
                {renderChoice(top, false)}
                {subsOf(top.id).map((sub) => renderChoice(sub, true))}
              </div>
            ))}
          </div>
          <p className={styles.summary}>
            <strong>{selected.length} kategori</strong> seçili · <strong>{sharedProducts} ürün adı</strong> paylaşılacak
          </p>

          <label className={styles.field}>
            <span>Şablon adı</span>
            <input
              type="text"
              maxLength={255}
              value={titleValue}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Admine not (opsiyonel)</span>
            <textarea
              rows={3}
              maxLength={2000}
              placeholder="ör. 2 kişilik mutfak için hazırladım"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {mutation.isError && <p className="error-text">{errorMessage(mutation.error)}</p>}
          {sent && <p className={styles.success}>✓ Öneriniz admine gönderildi. Teşekkürler!</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={mutation.isPending || !titleValue.trim() || selected.length === 0}
          >
            {mutation.isPending ? "Gönderiliyor..." : "📤 Şablon olarak öner"}
          </button>
        </form>
      )}

      {mine && mine.length > 0 && (
        <div className={styles.mine}>
          <h4>Önerilerin</h4>
          <ul>
            {mine.map((proposal) => (
              <li key={proposal.id}>
                <div className={styles.mineRow}>
                  <span>
                    <strong>{proposal.title}</strong>
                    <span className="muted">
                      {" "}
                      · {proposal.productCount} ürün · {dateFormatter.format(new Date(proposal.createdAt))}
                    </span>
                  </span>
                  <span className={`${styles.status} ${styles[`status${proposal.status}`]}`}>
                    {statusLabels[proposal.status]}
                  </span>
                </div>
                {proposal.adminNote && <p className={styles.adminNote}>Admin notu: {proposal.adminNote}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
