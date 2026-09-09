import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getShares, inviteToList, updateShareRole, removeShare } from "../api/shares";
import { useAuthStore } from "../store/authStore";
import { ROLE_LABELS, ROLE_BADGE_CLASS } from "../lib/shareRole";
import type { ShareRole } from "../types";
import styles from "./ListSharesPage.module.scss";

export default function ListSharesPage() {
  const { listId } = useParams<{ listId: string }>();
  const currentUserId = useAuthStore((state) => state.userId);
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("EDITOR");

  const { data: shares, isLoading, error } = useQuery({
    queryKey: ["shares", listId],
    queryFn: () => getShares(listId!),
    enabled: !!listId,
  });

  const isOwner = shares?.some((share) => share.role === "OWNER" && share.userId === currentUserId) ?? false;

  const inviteMutation = useMutation({
    mutationFn: () => inviteToList(listId!, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares", listId] });
      setEmail("");
      setRole("EDITOR");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ shareId, newRole }: { shareId: string; newRole: ShareRole }) =>
      updateShareRole(listId!, shareId, newRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shares", listId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (shareId: string) => removeShare(listId!, shareId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shares", listId] }),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate();
  }

  if (!listId) return null;

  return (
    <div>
      <Link to={`/lists/${listId}`} className="back-link">
        ← Kategoriler
      </Link>
      <h1>Aile</h1>

      {isLoading && <p className="muted">Yükleniyor...</p>}
      {error && <p className="error-text">Üyeler yüklenemedi</p>}

      <ul className={styles.memberList}>
        {shares?.map((member) => (
          <li key={member.userId} className={`card ${styles.memberRow}`}>
            <div>
              <div className={styles.memberName}>{member.name}</div>
              <div className={styles.memberEmail}>{member.email}</div>
            </div>
            <div className={styles.memberActions}>
              <span className={`badge ${ROLE_BADGE_CLASS[member.role]}`}>{ROLE_LABELS[member.role]}</span>
              {isOwner && member.shareId && (
                <>
                  <select
                    value={member.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({ shareId: member.shareId!, newRole: e.target.value as ShareRole })
                    }
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value="EDITOR">Düzenleyici</option>
                    <option value="VIEWER">Görüntüleyici</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => removeMutation.mutate(member.shareId!)}
                    disabled={removeMutation.isPending}
                  >
                    Çıkar
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isOwner && (
        <form onSubmit={handleInvite} className={`form-row ${styles.form}`}>
          <div className="field">
            <label>E-posta</label>
            <input
              type="email"
              placeholder="aile.uyesi@ornek.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)}>
              <option value="EDITOR">Düzenleyici</option>
              <option value="VIEWER">Görüntüleyici</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? "Davet ediliyor..." : "Aileni Davet Et"}
          </button>
          {inviteMutation.isError && (
            <p className="error-text">
              {(inviteMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
                "Davet gönderilemedi"}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
