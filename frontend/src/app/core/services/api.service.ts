import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.model';

type ParamValue = string | number | boolean | null | undefined;

/**
 * Thin transport layer. Every feature service goes through here so the base
 * URL, the response envelope and query-string building are defined once.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/$/, '');

  /** Drops null/undefined/'' so optional filters never reach the API as empty. */
  private toParams(query?: Record<string, ParamValue>): HttpParams {
    let params = new HttpParams();
    if (!query) return params;

    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      params = params.set(key, String(value));
    }
    return params;
  }

  private url(path: string): string {
    return `${this.base}/${path.replace(/^\//, '')}`;
  }

  /** Unwraps the envelope — callers get `data` directly. */
  get<T>(path: string, query?: Record<string, ParamValue>): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), { params: this.toParams(query) })
      .pipe(map((response) => response.data));
  }

  /** Keeps the envelope — used where pagination metadata is needed. */
  getWithMeta<T, M>(path: string, query?: Record<string, ParamValue>): Observable<ApiResponse<T, M>> {
    return this.http.get<ApiResponse<T, M>>(this.url(path), { params: this.toParams(query) });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body ?? {})
      .pipe(map((response) => response.data));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body ?? {})
      .pipe(map((response) => response.data));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.url(path), body ?? {})
      .pipe(map((response) => response.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(this.url(path)).pipe(map((response) => response.data));
  }

  /**
   * Multipart upload. `reportProgress` is left off deliberately: the admin
   * forms show an indeterminate state, and observing progress events would
   * force every caller to filter the event stream.
   */
  upload<T>(path: string, form: FormData): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), form)
      .pipe(map((response) => response.data));
  }
}
