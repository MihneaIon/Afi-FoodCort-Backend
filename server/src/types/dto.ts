// Kept as plain strings at the DB/wire level (a Prisma enum would rename
// these to identifiers like MEDIUM, breaking clients that send "$$").
// The allowed set is enforced at the DB via a CHECK constraint
// (see prisma/migrations/20260818000000_add_price_rating_check_constraints)
// and at the route level via zod (see ../validation/schemas).
export const PRICE_RANGES = ['$', '$$', '$$$', '$$$$'] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

// Request body/query shapes now live in ../validation/schemas as zod schemas,
// with their types derived via z.infer so validation and typing can't drift
// apart.