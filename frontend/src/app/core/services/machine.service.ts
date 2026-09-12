import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse, PaginationMeta } from '../models/api.model';
import {
  Machine,
  MachineDocument,
  MachineImage,
  MachinePayload,
  MachineQuery,
  MachineStatus,
} from '../models/machine.model';
import { ApiService } from './api.service';

export interface MachinePage {
  items: Machine[];
  meta: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class MachineService {
  private readonly api = inject(ApiService);

  list(query: MachineQuery = {}): Observable<MachinePage> {
    return this.api
      .getWithMeta<Machine[], PaginationMeta>('machines', {
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        category: query.category,
        status: query.status,
        featured: query.featured === undefined ? undefined : String(query.featured),
        sort: query.sort,
        includeUnpublished:
          query.includeUnpublished === undefined ? undefined : String(query.includeUnpublished),
      })
      .pipe(
        map((response: ApiResponse<Machine[], PaginationMeta>) => ({
          items: response.data ?? [],
          meta: response.meta ?? { total: 0, page: 1, pageSize: 12, totalPages: 1 },
        })),
      );
  }

  /** `idOrSlug` accepts either — the API resolves both. */
  get(idOrSlug: string): Observable<Machine> {
    return this.api.get<Machine>(`machines/${encodeURIComponent(idOrSlug)}`);
  }

  create(payload: MachinePayload): Observable<Machine> {
    return this.api.post<Machine>('machines', payload);
  }

  update(id: string, payload: Partial<MachinePayload>): Observable<Machine> {
    return this.api.put<Machine>(`machines/${id}`, payload);
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`machines/${id}`);
  }

  setStatus(id: string, status: MachineStatus): Observable<Machine> {
    return this.api.patch<Machine>(`machines/${id}/status`, { status });
  }

  // --- Images ---------------------------------------------------------------

  uploadImages(id: string, files: FileList | File[]): Observable<MachineImage[]> {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));
    return this.api.upload<MachineImage[]>(`machines/${id}/images`, form);
  }

  updateImage(
    machineId: string,
    imageId: string,
    changes: Partial<Pick<MachineImage, 'altEn' | 'altAr' | 'isMain' | 'sortOrder'>>,
  ): Observable<MachineImage[]> {
    return this.api.patch<MachineImage[]>(`machines/${machineId}/images/${imageId}`, changes);
  }

  reorderImages(machineId: string, order: string[]): Observable<MachineImage[]> {
    return this.api.put<MachineImage[]>(`machines/${machineId}/images/reorder`, { order });
  }

  deleteImage(machineId: string, imageId: string): Observable<MachineImage[]> {
    return this.api.delete<MachineImage[]>(`machines/${machineId}/images/${imageId}`);
  }

  // --- Documents ------------------------------------------------------------

  uploadDocuments(
    id: string,
    files: FileList | File[],
    titles?: { titleEn?: string; titleAr?: string },
  ): Observable<MachineDocument[]> {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('documents', file));
    if (titles?.titleEn) form.append('titleEn', titles.titleEn);
    if (titles?.titleAr) form.append('titleAr', titles.titleAr);
    return this.api.upload<MachineDocument[]>(`machines/${id}/documents`, form);
  }

  deleteDocument(machineId: string, documentId: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`machines/${machineId}/documents/${documentId}`);
  }

  /** Picks the card/hero image, tolerating a machine with no photographs yet. */
  static mainImage(machine: Machine | null | undefined): MachineImage | null {
    if (!machine?.images?.length) return null;
    return machine.images.find((image) => image.isMain) ?? machine.images[0];
  }
}
