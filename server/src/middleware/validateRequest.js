// Generic request-body validator using Zod schemas.
// WHY: validating input at the edge keeps controllers clean and returns
// clear, consistent error messages to the frontend.

/**
 * @param {import('zod').ZodSchema} schema - schema to validate req.body against
 * @returns Express middleware that replaces req.body with the parsed result
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Flatten Zod issues into a simple field -> message map
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    req.body = result.data; // sanitized/typed data
    next();
  };
}
