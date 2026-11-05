// Query validation middleware
import { z } from 'zod';
import { validate } from './validateRequest.js';

// Pagination schema factory
export function paginationSchema({ defaultLimit = 10, maxLimit = 100 } = {}) {
  return z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(maxLimit).default(defaultLimit),
  });
}

// Sort schema factory
export function sortSchema(allowedFields, defaultField = 'createdAt', defaultOrder = 'desc') {
  const fieldEnum = z.enum(allowedFields);
  const orderEnum = z.enum(['asc', 'desc']);
  return z.object({
    sortBy: fieldEnum.default(defaultField),
    sortOrder: orderEnum.default(defaultOrder),
  });
}

// Middleware to validate query parameters
export function validateQuery(schema) {
  return validate(schema, 'query');
}
