export type UserRole = 'ADMIN' | 'EDITOR';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  lastLogin: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthSession {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface DashboardStats {
  machines: { total: number; published: number; drafts: number; sold: number };
  categories: number;
  messages: { total: number; unread: number };
  recentMessages: Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    status: MessageStatus;
    createdAt: string;
  }>;
  topViewed: Array<{
    id: string;
    slug: string;
    nameEn: string;
    nameAr: string;
    viewCount: number;
    status: string;
  }>;
}

export type MessageStatus = 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  machineId: string | null;
  machine?: { id: string; slug: string; nameEn: string; nameAr: string } | null;
  status: MessageStatus;
  locale: string;
  createdAt: string;
}

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  machineId?: string | null;
  locale: string;
  /** Honeypot — always sent empty by the real form. */
  website?: string;
}
