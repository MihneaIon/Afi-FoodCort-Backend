import { z } from 'zod';
import { PRICE_RANGES } from '../types/dto';

// Centralized request validation. Every route below used to hand-roll its own
// `if (!field) throw ...` checks, which let malformed values slip through
// silently — e.g. priceRange accepted any string, rating skipped its range
// check when given a non-numeric value (relational comparisons against a
// string coerce to NaN, and every NaN comparison is false), and userEmail had
// no format check at all despite the field name. Zod schemas make these
// checks explicit, in one place, and consistent across routes.

const priceRangeSchema = z.enum(PRICE_RANGES, {
  errorMap: () => ({ message: `priceRange must be one of ${PRICE_RANGES.join(', ')}` })
});

// Optional scalar columns (String?/Float? in schema.prisma) accept either a
// missing field or an explicit `null` from a JSON client — both mean "not
// set" — so these normalize either spelling to `undefined` instead of
// rejecting `null` outright.
const optionalString = () =>
  z
    .string()
    .trim()
    .nullish()
    .transform((v) => v ?? undefined);

const optionalNumber = () =>
  z
    .number()
    .nullish()
    .transform((v) => v ?? undefined);

// A page/limit pair that mirrors the previous `Number(x) || default` +
// clamp behaviour: non-numeric input silently falls back to the default
// instead of failing the request, but the result is always clamped to a
// sane range so a client can't request an unbounded page size.
const paginationSchema = (defaultLimit: number, maxLimit: number) => ({
  page: z.coerce.number().int().catch(1).transform((v) => Math.max(v, 1)),
  limit: z.coerce.number().int().catch(defaultLimit).transform((v) => Math.min(Math.max(v, 1), maxLimit))
});

export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'id is required')
});

// ---------------------------------------------------------------------------
// Restaurants
// ---------------------------------------------------------------------------

export const restaurantListQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  priceRange: priceRangeSchema.optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  discounted: z.string().optional(),
  applyMealTickets: z.string().optional(),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['name', 'rating', 'price', 'newest', 'mealTickets']).catch('rating'),
  sortOrder: z.enum(['asc', 'desc']).catch('desc'),
  ...paginationSchema(12, 100)
});

// applyDiscount/discountPercentage are cross-checked together, so the rule
// lives in a superRefine rather than on either field individually.
function checkDiscountRange(
  data: { applyDiscount?: boolean; discountPercentage?: number },
  ctx: z.RefinementCtx
) {
  if (
    data.applyDiscount &&
    (data.discountPercentage === undefined || data.discountPercentage <= 0 || data.discountPercentage > 100)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discountPercentage'],
      message: 'Discount percentage must be between 1 and 100 when applying discount'
    });
  }
}

export const createRestaurantBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    description: optionalString(),
    address: z.string().trim().min(1, 'Address is required'),
    phone: optionalString(),
    website: optionalString(),
    imageUrl: optionalString(),
    priceRange: priceRangeSchema,
    applyDiscount: z.boolean().optional().default(false),
    discountPercentage: optionalNumber(),
    isAcceptedMealTickets: z.boolean().optional(),
    categoryIds: z.array(z.string().trim().min(1)).min(1, 'At least one category is required')
  })
  .superRefine((data, ctx) => {
    checkDiscountRange(data, ctx);
    if (!data.applyDiscount && data.discountPercentage !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountPercentage'],
        message: 'Cannot set discount percentage when applyDiscount is false'
      });
    }
  });

export const updateRestaurantBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: optionalString(),
    address: z.string().trim().min(1).optional(),
    phone: optionalString(),
    website: optionalString(),
    imageUrl: optionalString(),
    priceRange: priceRangeSchema.optional(),
    isOpen: z.boolean().optional(),
    applyDiscount: z.boolean().optional(),
    discountPercentage: optionalNumber(),
    isAcceptedMealTickets: z.boolean().optional(),
    categoryIds: z.array(z.string().trim().min(1)).min(1, 'At least one category is required').optional()
  })
  .superRefine(checkDiscountRange);

export type RestaurantListQuery = z.infer<typeof restaurantListQuerySchema>;
export type CreateRestaurantBody = z.infer<typeof createRestaurantBodySchema>;
export type UpdateRestaurantBody = z.infer<typeof updateRestaurantBodySchema>;

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const restaurantIdParamSchema = z.object({
  restaurantId: z.string().trim().min(1, 'restaurantId is required')
});

export const reviewsByRestaurantQuerySchema = z.object(paginationSchema(10, 100));

// An empty string or null means "no email was entered" (common from a form
// field) rather than an invalid one, so both are normalized to undefined
// instead of being rejected.
const emailSchema = z
  .union([z.string().trim().email('userEmail must be a valid email address'), z.literal('')])
  .nullish()
  .transform((value) => (value === '' || value == null ? undefined : value));

export const createReviewBodySchema = z.object({
  restaurantId: z.string().trim().min(1, 'Restaurant ID is required'),
  rating: z
    .number({
      required_error: 'Rating is required',
      invalid_type_error: 'Rating must be a number'
    })
    .int('Rating must be an integer')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  comment: optionalString(),
  userName: z.string().trim().min(1, 'User name is required'),
  userEmail: emailSchema
});

export type ReviewsByRestaurantQuery = z.infer<typeof reviewsByRestaurantQuerySchema>;
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoryAuditQuerySchema = z.object({
  limit: z.coerce.number().int().catch(50).transform((v) => Math.min(Math.max(v, 1), 200)),
  category_id: z.string().trim().min(1).optional()
});

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  description: optionalString(),
  icon: optionalString()
});

export type CategoryAuditQuery = z.infer<typeof categoryAuditQuerySchema>;
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;