-- These fields were unconstrained String/Int columns with validity relying
-- entirely on ad hoc route-level checks (and, for restaurants.priceRange,
-- no check at all). Add CHECK constraints so bad data can't reach the DB
-- through any path, not just the routes that happen to validate it.
ALTER TABLE "public"."restaurants"
  ADD CONSTRAINT "restaurants_priceRange_check" CHECK ("priceRange" IN ('$', '$$', '$$$', '$$$$'));

ALTER TABLE "public"."restaurants"
  ADD CONSTRAINT "restaurants_rating_check" CHECK ("rating" >= 0 AND "rating" <= 5);

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);
