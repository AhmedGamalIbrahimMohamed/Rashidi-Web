import { Category } from './category.model';

export type MachineStatus = 'AVAILABLE' | 'IN_STOCK' | 'SOLD';

export const MACHINE_STATUSES: readonly MachineStatus[] = ['AVAILABLE', 'IN_STOCK', 'SOLD'] as const;

export interface MachineImage {
  id: string;
  machineId: string;
  url: string;
  thumbnailUrl: string | null;
  storageKey: string;
  altEn: string | null;
  altAr: string | null;
  isMain: boolean;
  sortOrder: number;
  width: number | null;
  height: number | null;
  /** Tiny base64 WebP shown while the real image decodes. */
  blurDataUrl: string | null;
  createdAt: string;
}

export interface MachineSpecification {
  id: string;
  machineId: string;
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  groupEn: string | null;
  groupAr: string | null;
  sortOrder: number;
}

export interface MachineDocument {
  id: string;
  machineId: string;
  titleEn: string;
  titleAr: string;
  url: string;
  mimeType: string | null;
  fileSize: number | null;
  sortOrder: number;
}

export interface Machine {
  id: string;
  slug: string;

  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string | null;
  shortDescriptionAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  technicalInfoEn: string | null;
  technicalInfoAr: string | null;

  status: MachineStatus;

  brand: string | null;
  modelNumber: string | null;
  manufactureYear: number | null;
  countryOfOrigin: string | null;
  condition: string | null;

  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
  viewCount: number;

  metaTitleEn: string | null;
  metaTitleAr: string | null;
  metaDescriptionEn: string | null;
  metaDescriptionAr: string | null;

  categoryId: string | null;
  category?: Category | null;

  images: MachineImage[];
  specifications?: MachineSpecification[];
  documents?: MachineDocument[];

  /** Present only on the details endpoint. */
  related?: Machine[];

  createdAt: string;
  updatedAt: string;
}

export interface MachineQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: MachineStatus;
  featured?: boolean;
  sort?: 'newest' | 'oldest' | 'name' | 'popular' | 'manual';
  includeUnpublished?: boolean;
}

/** Payload accepted by POST/PUT /api/machines. */
export interface MachinePayload {
  slug?: string | null;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn?: string | null;
  shortDescriptionAr?: string | null;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  technicalInfoEn?: string | null;
  technicalInfoAr?: string | null;
  status?: MachineStatus;
  brand?: string | null;
  modelNumber?: string | null;
  manufactureYear?: number | null;
  countryOfOrigin?: string | null;
  condition?: string | null;
  isFeatured?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  metaTitleEn?: string | null;
  metaTitleAr?: string | null;
  metaDescriptionEn?: string | null;
  metaDescriptionAr?: string | null;
  categoryId?: string | null;
  specifications?: Array<Omit<MachineSpecification, 'id' | 'machineId'>>;
}
