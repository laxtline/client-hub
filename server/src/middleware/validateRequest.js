export function validate(schema) {
  return (req, res, next) => {
    const result = schema(req.body);
    if (!result.valid) {
      return res.status(400).json({ message: 'Validation failed', errors: result.errors });
    }
    req.body = result.data;
    next();
  };
}

export function optionalDate(value) {
  if (!value) return true;
  return !isNaN(Date.parse(value));
}