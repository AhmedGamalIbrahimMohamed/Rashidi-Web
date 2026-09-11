export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { machines: number };
}

export interface CategoryPayload {
  slug?: string | null;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}
