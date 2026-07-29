// Formats a number as Indian Rupees (the agency bills in INR).
// Falls back gracefully if given a non-number.
export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
