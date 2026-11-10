export function validateQuery(schema) {
  return (req, res, next) => {
    const { page, limit, sortBy, sortOrder, ...rest } = req.query;
    const result = schema(req.query);
    if (!result.valid) {
      return res.status(400).json({ message: 'Invalid query', errors: result.errors });
    }
    req.query = { ...result.data };
    next();
  };
}

export function paginationSchema({ defaultLimit = 10, maxLimit = 100 } = {}) {
  return (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || defaultLimit;
    if (page < 1) return { valid: false, errors: ['page must be positive'] };
    if (limit < 1 || limit > maxLimit) return { valid: false, errors: [`limit must be 1-${maxLimit}`] };
    return { valid: true, data: { page, limit } };
  };
}

export function sortSchema(allowedFields, defaultField = 'createdAt', defaultOrder = 'desc') {
  return (query) => {
    const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
    const sortOrder = ['asc', 'desc'].includes(query.sortOrder) ? query.sortOrder : defaultOrder;
    return { valid: true, data: { sortBy, sortOrder } };
  };
}