// ── DB row shapes ──────────────────────────────────────────────────────────────

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: Date;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at: Date;
}

// ── API response shapes (camelCase) ───────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface UnreadCount {
  count: number;
}

export interface PushSubscriptionInfo {
  id: string;
  userId: string;
  endpoint: string;
  createdAt: Date;
}

// ── Service input types ────────────────────────────────────────────────────────

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: string | null;
}
