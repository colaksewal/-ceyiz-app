import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createList, getMyLists } from "../api/lists";
import { ROLE_LABELS, ROLE_BADGE_CLASS } from "../lib/shareRole";
import { pickListAccent } from "../lib/listAccent";
import type { TrousseauListItem } from "../types";
import styles from "./ListsPage.module.scss";

// "mine": kullanıcının sahibi olduğu listeler. "team": başkalarının kullanıcıyı ekibine
// davet ettiği listeler (Çeyiz Ekibim). İkisi de aynı /lists cevabından süzülür.
export default function ListsPage({ mode = "mine" }: { mode?: "mine" | "team" }) {
  const { data: lists, isLoading, error } = useQuery({
    queryKey: ["lists"],
    queryFn: getMyLists,
  });

  const owned = lists?.filter((l) => l.role === "OWNER");
  const shared = lists?.filter((l) => l.role !== "OWNER");

  if (mode === "team") {
    return (
      <div>
        <h1>Çeyiz Ekibim</h1>
        <p className={`muted ${styles.lead}`}>Seni çeyiz ekibine davet ettikleri listeler.</p>

        {isLoading && <p className="muted">Yükleniyor...</p>}
        {error && <p className="error-text">Listeler yüklenemedi</p>}
        {shared && shared.length === 0 && (
          <div className="empty-state">
            <div className={styles.emptyEmoji}>👥</div>
            Henüz kimse seni bir çeyiz ekibine davet etmedi.
            <br />
            Davet edilmek için listenin sahibine kayıt olduğun e-posta adresini söyle.
          </div>
        )}
        <ListCards lists={shared} />
      </div>
    );
  }

  return (
    <div>
      <h1>Listelerim</h1>
      <CreateListForm />

      {shared && shared.length > 0 && (
        <Link to="/ceyiz-ekibim" className={styles.teamBanner}>
          <span className={styles.teamBannerIcon}>👥</span>
          <span className={styles.teamBannerText}>
            <strong>{shared.length} listenin çeyiz ekibindesin</strong>
            <span>Seni davet ettikleri listeleri gör</span>
          </span>
          <span className={styles.teamBannerArrow} aria-hidden="true">
            ›
          </span>
        </Link>
      )}

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Listeler yüklenemedi</p>}
      {owned && owned.length === 0 && (
        <p className="empty-state">Henüz listen yok. Yukarıdan bir tane oluştur.</p>
      )}
      <ListCards lists={owned} />
    </div>
  );
}

function CreateListForm() {
  const [name, setName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => createList({ name, weddingDate: weddingDate || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lists"] });
      setName("");
      setWeddingDate("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className={`form-row ${styles.form}`}>
      <div className={`field ${styles.nameField}`}>
        <label>Liste adı</label>
        <input
          type="text"
          placeholder="ör. Bizim Çeyiz Listemiz"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className={`field ${styles.dateField}`}>
        <label>Düğün tarihi</label>
        <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
      </div>
      <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
        {createMutation.isPending ? "Oluşturuluyor..." : "Yeni Liste"}
      </button>
    </form>
  );
}

function ListCards({ lists }: { lists: TrousseauListItem[] | undefined }) {
  if (!lists || lists.length === 0) return null;

  return (
    <ul className="card-list">
      {lists.map((list) => {
        const accent = pickListAccent(list.id);
        return (
          <li key={list.id} className={`card ${styles.item}`} style={{ borderLeftColor: accent.color }}>
            <div className={styles.itemMain}>
              <span className={styles.emojiBadge} style={{ background: accent.color }}>
                {accent.emoji}
              </span>
              <div className={styles.itemText}>
                <Link to={`/lists/${list.id}`} className={styles.itemName}>
                  {list.name}
                </Link>
                {list.weddingDate && <span className={styles.itemDate}>{list.weddingDate}</span>}
              </div>
            </div>
            <span className={`badge ${ROLE_BADGE_CLASS[list.role]}`}>{ROLE_LABELS[list.role]}</span>
          </li>
        );
      })}
    </ul>
  );
}
