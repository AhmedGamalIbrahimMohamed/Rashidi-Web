import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse, PaginationMeta } from '../models/api.model';
import {
  ContactMessage,
  ContactPayload,
  DashboardStats,
  MessageStatus,
} from '../models/auth.model';
import { ApiService } from './api.service';

export interface MessagePage {
  items: ContactMessage[];
  meta: PaginationMeta & { unread: number };
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly api = inject(ApiService);

  /** Public contact form. */
  send(payload: ContactPayload): Observable<{ id: string; message: string }> {
    return this.api.post<{ id: string; message: string }>('contact', payload);
  }

  // --- Admin inbox ----------------------------------------------------------

  list(
    query: { page?: number; pageSize?: number; status?: MessageStatus; search?: string } = {},
  ): Observable<MessagePage> {
    return this.api
      .getWithMeta<ContactMessage[], PaginationMeta & { unread: number }>('contact', query)
      .pipe(
        map((response: ApiResponse<ContactMessage[], PaginationMeta & { unread: number }>) => ({
          items: response.data ?? [],
          meta: response.meta ?? { total: 0, page: 1, pageSize: 20, totalPages: 1, unread: 0 },
        })),
      );
  }

  get(id: string): Observable<ContactMessage> {
    return this.api.get<ContactMessage>(`contact/${id}`);
  }

  setStatus(id: string, status: MessageStatus): Observable<ContactMessage> {
    return this.api.patch<ContactMessage>(`contact/${id}`, { status });
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`contact/${id}`);
  }

  stats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('contact/stats/overview');
  }
}
