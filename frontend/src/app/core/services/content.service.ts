import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { ApiResponse } from '../models/api.model';
import {
  AboutContent,
  CONTENT_KEYS,
  CapabilitiesContent,
  ContactDetails,
  ContentBlock,
  ContentMap,
  ContentPayload,
  FooterContent,
  HeroContent,
  SiteMeta,
  SocialLink,
  StatItem,
  resolveContent,
} from '../models/content.model';
import { ApiService } from './api.service';
import { I18nService } from './i18n.service';

/**
 * Editable site copy.
 *
 * Loaded once at bootstrap and cached in a signal. The API returns both
 * languages for every block, so switching language re-derives the computed
 * values instantly without another request.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  private readonly _content = signal<ContentMap>({});
  private readonly _blocks = signal<ContentBlock[]>([]);
  private readonly _loaded = signal(false);

  private inflight$: Observable<ContentMap> | null = null;

  readonly loaded = this._loaded.asReadonly();
  /** Raw rows — the dashboard editor needs the labels and grouping. */
  readonly blocks = this._blocks.asReadonly();

  // Typed, locale-resolved views of each block the website renders.
  readonly hero = this.block<HeroContent>(CONTENT_KEYS.hero);
  readonly stats = computed(
    () => this.block<{ items?: StatItem[] }>(CONTENT_KEYS.stats)()?.items ?? [],
  );
  readonly capabilities = this.block<CapabilitiesContent>(CONTENT_KEYS.capabilities);
  readonly about = this.block<AboutContent>(CONTENT_KEYS.about);
  readonly contact = this.block<ContactDetails>(CONTENT_KEYS.contact);
  readonly social = computed(
    () => this.block<{ items?: SocialLink[] }>(CONTENT_KEYS.social)()?.items ?? [],
  );
  readonly siteMeta = this.block<SiteMeta>(CONTENT_KEYS.siteMeta);
  readonly footer = this.block<FooterContent>(CONTENT_KEYS.footer);

  /**
   * Fetches once per session. Concurrent callers (the app shell and a page
   * resolving at the same time) share a single request.
   */
  load(force = false): Observable<ContentMap> {
    if (this._loaded() && !force) return of(this._content());
    if (this.inflight$ && !force) return this.inflight$;

    this.inflight$ = this.api.getWithMeta<ContentMap, { blocks: ContentBlock[] }>('content').pipe(
      map((response: ApiResponse<ContentMap, { blocks: ContentBlock[] }>) => {
        this._content.set(response.data ?? {});
        this._blocks.set(response.meta?.blocks ?? []);
        this._loaded.set(true);
        return response.data ?? {};
      }),
      // Bootstrap must not fail because content is unreachable — every template
      // falls back when a block is missing.
      catchError(() => of({} as ContentMap)),
      finalize(() => (this.inflight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.inflight$;
  }

  /** Builds a computed that resolves one key to the active language. */
  block<T>(key: string) {
    return computed<T | null>(() => resolveContent<T>(this._content()[key], this.i18n.locale()));
  }

  /** Raw both-language value, used by the dashboard editor. */
  raw(key: string): { en: unknown; ar: unknown } | null {
    return this._content()[key] ?? null;
  }

  save(items: ContentPayload[]): Observable<ContentMap> {
    const body = items.length === 1 ? items[0] : { items };
    return this.api.put<ContentMap>('content', body).pipe(
      tap((updated) => {
        this._content.update((current) => ({ ...current, ...updated }));
      }),
    );
  }

  uploadImage(file: File): Observable<{ url: string; thumbnailUrl: string }> {
    const form = new FormData();
    form.append('image', file);
    return this.api.upload<{ url: string; thumbnailUrl: string }>('content/media', form);
  }
}
