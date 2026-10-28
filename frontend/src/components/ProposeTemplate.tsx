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

// Kullanıcı listesini şablon olarak önerir. Gönderilen: kategoriler, alt kategoriler ve ürün adları (fiyat,
// mağaza ve link gitmez). Admin inceler, düzenleyip herkesin kullandığı şablonlara ekler ya da reddeder.
export default function ProposeTemplate({ listId, categories }: { listId: string; categories: Category[] }) {
  const queryClient = useQueryClient();
  const { data: lists } = useQuery({ queryKey: ["lists"], queryFn: getMyLists });
  const listName = lists?.find((list) => list.id === listId)?.name ?? "";
  const [title, setTitle] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<TemplateProposal | null>(null);

  const { data: mine } = useQuery({ queryKey: ["myProposals"], queryFn: getMyProposals });

  const topLevelCount = categories.filter((category) => category.parentId === null).length;
  const productCount = categories.reduce((sum, category) => sum + category.productCount, 0);
  const titleValue = title ?? listName;

  const mutation = useMutation({
    mutationFn: () => proposeTemplate({ listId, title: titleValue.trim(), note: note.trim() || null }),
    onSuccess: (proposal) => {
      setSent(proposal);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["myProposals"] });
      queryClient.invalidateQueries({ queryKey: ["pendingProposals"] });
    },
  });

  return (
    <div className={styles.box}>
      <p className={styles.hint}>
        Listendeki <strong>{topLevelCount} kategori</strong> ve <strong>{productCount} ürün</strong> adı admine
        gönderilir. Fiyat, mağaza ve link gitmez. Admin inceleyip uygun görürse herkesin kullanabileceği şablonlara
        ekler.
      </p>

      {productCount === 0 ? (
        <p className="muted">Listede henüz ürün yok; önce ürün ekle.</p>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            if (!titleValue.trim()) return;
            setSent(null);
            mutation.mutate();
          }}
        >
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
          <button type="submit" className="btn btn-primary" disabled={mutation.isPending || !titleValue.trim()}>
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
