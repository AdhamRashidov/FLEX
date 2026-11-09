export interface CategoryEntity {
  id: number;
  storeId: number;
  parentId?: number | null;
  name: string;
  slug: string;
  emoji?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
