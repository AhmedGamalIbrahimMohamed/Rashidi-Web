import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Category, CategoryPayload } from '../models/category.model';
import { ApiService } from './api.service';

/**
 * Categories change rarely and are needed by the catalogue filters, the machine
 * form and the footer, so the list is cached in a signal after the first fetch.
 */
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);

  private readonly _categories = signal<Category[]>([]);
  private readonly _loaded = signal(false);

  readonly categories = this._categories.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  load(force = false): Observable<Category[]> {
    if (this._loaded() && !force) return of(this._categories());

    return this.api.get<Category[]>('categories').pipe(
      tap((categories) => {
        this._categories.set(categories ?? []);
        this._loaded.set(true);
      }),
    );
  }

  get(idOrSlug: string): Observable<Category> {
    return this.api.get<Category>(`categories/${encodeURIComponent(idOrSlug)}`);
  }

  create(payload: CategoryPayload): Observable<Category> {
    return this.api.post<Category>('categories', payload).pipe(tap(() => this.invalidate()));
  }

  update(id: string, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.api.put<Category>(`categories/${id}`, payload).pipe(tap(() => this.invalidate()));
  }

  remove(id: string): Observable<{ id: string; message: string }> {
    return this.api
      .delete<{ id: string; message: string }>(`categories/${id}`)
      .pipe(tap(() => this.invalidate()));
  }

  reorder(order: string[]): Observable<Category[]> {
    return this.api
      .put<Category[]>('categories/reorder', { order })
      .pipe(tap((categories) => this._categories.set(categories)));
  }

  private invalidate(): void {
    this._loaded.set(false);
  }
}
