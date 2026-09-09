import type { ShareRole } from "../types";

export const ROLE_LABELS: Record<ShareRole, string> = {
  OWNER: "Sahip",
  EDITOR: "Düzenleyici",
  VIEWER: "Görüntüleyici",
};

export const ROLE_BADGE_CLASS: Record<ShareRole, string> = {
  OWNER: "badge-success",
  EDITOR: "badge-neutral",
  VIEWER: "badge-warning",
};
