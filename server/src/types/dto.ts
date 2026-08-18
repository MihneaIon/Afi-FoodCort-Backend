import { ParsedQs } from 'qs';

// Query strings arrive as string | ParsedQs | (string | ParsedQs)[] | undefined
// no matter what the client sends, so every field here is a plain optional
// string — callers still need Number(...)/comparisons to coerce, same as before.

export interface RestaurantListQuery extends ParsedQs {
  category?: string;
  priceRange?: string;
  rating?: string;
  discounted?: string;
  applyMealTickets?: string;
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateRestaurantBody {
  name: string;
  description?: string;
  address: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  priceRange: string;
  applyDiscount?: boolean;
  discountPercentage?: number;
  isAcceptedMealTickets?: boolean;
  categoryIds: string[];
}

export interface UpdateRestaurantBody {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  imageUrl?: string;
  priceRange?: string;
  isOpen?: boolean;
  applyDiscount?: boolean;
  discountPercentage?: number;
  isAcceptedMealTickets?: boolean;
  categoryIds?: string[];
}

export interface CategoryAuditQuery extends ParsedQs {
  limit?: string;
  category_id?: string;
}

export interface CreateCategoryBody {
  name: string;
  description?: string;
  icon?: string;
}

export interface ReviewsByRestaurantQuery extends ParsedQs {
  page?: string;
  limit?: string;
}

export interface CreateReviewBody {
  restaurantId: string;
  rating: number;
  comment?: string;
  userName: string;
  userEmail?: string;
}