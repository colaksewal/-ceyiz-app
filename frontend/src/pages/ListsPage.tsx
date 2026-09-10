import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createList, getMyLists } from "../api/lists";
import { ROLE_LABELS, ROLE_BADGE_CLASS } from "../lib/shareRole";
import styles from "./ListsPage.module.scss";

export default function ListsPage() {
  const [name, setName] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const queryClient = useQueryClient();

  const { data: lists, isLoading, error } = useQuery({
    queryKey: ["lists"],
    queryFn: getMyLists,
  });

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
    <div>
      <h1>Listelerim</h1>

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

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Listeler yüklenemedi</p>}
      {lists && lists.length === 0 && (
        <p className="empty-state">Henüz listen yok. Yukarıdan bir tane oluştur.</p>
      )}

      <ul className="card-list">
        {lists?.map((list) => (
          <li key={list.id} className={`card ${styles.item}`}>
            <div>
              <Link to={`/lists/${list.id}`} className={styles.itemName}>
                {list.name}
              </Link>
              {list.weddingDate && <span className={styles.itemDate}>{list.weddingDate}</span>}
            </div>
            <span className={`badge ${ROLE_BADGE_CLASS[list.role]}`}>{ROLE_LABELS[list.role]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
