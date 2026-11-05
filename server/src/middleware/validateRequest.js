import { z } from 'zod';

export const optionalDate = z
  .string()
  .refine((value) => !value || Number.isFinite(Date.parse(value)), 'Invalid date')
  .optional()
  .nullable();

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    req[source] = result.data;
    next();
  };
}
