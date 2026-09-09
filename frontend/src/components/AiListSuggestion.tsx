import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { suggestList } from "../api/ai";
import type { ListSuggestionResponse } from "../types";
import styles from "./AiListSuggestion.module.scss";

export default function AiListSuggestion() {
  const [isOpen, setIsOpen] = useState(false);
  const [homeType, setHomeType] = useState("");
  const [budget, setBudget] = useState("");
  const [priorities, setPriorities] = useState("");
  const [result, setResult] = useState<ListSuggestionResponse | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      suggestList({
        homeType,
        budget: Number(budget),
        priorities: priorities
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      }),
    onSuccess: (data) => setResult(data),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!homeType.trim() || !budget) return;
    setResult(null);
    mutation.mutate();
  }

  if (!isOpen) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(true)}>
        AI ile Liste Öner
      </button>
    );
  }

  return (
    <div className={styles.panel}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className="field">
          <label>Ev tipi</label>
          <input
            type="text"
            placeholder="ör. 2+1 daire"
            value={homeType}
            onChange={(e) => setHomeType(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Toplam bütçe (TL)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Öncelikler (virgülle ayır)</label>
          <input
            type="text"
            placeholder="ör. mutfak, yatak odası"
            value={priorities}
            onChange={(e) => setPriorities(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? "AI düşünüyor... (30sn-2dk sürebilir)" : "Öneri Al"}
        </button>
      </form>

      {mutation.isSuccess && result === null && (
        <p className={styles.unavailable}>
          AI şu an kullanılamıyor. Listeni manuel olarak oluşturabilirsin.
        </p>
      )}

      {result && (
        <div className={styles.result}>
          {result.categories.map((category) => (
            <div key={category.categoryName} className={styles.category}>
              <div className={styles.categoryHeader}>
                <span>{category.categoryName}</span>
                <span>{category.suggestedBudget} TL</span>
              </div>
              <ul className={styles.products}>
                {category.exampleProducts.map((product) => (
                  <li key={product}>{product}</li>
                ))}
              </ul>
            </div>
          ))}
          <p className={styles.rationale}>{result.rationale}</p>
        </div>
      )}
    </div>
  );
}