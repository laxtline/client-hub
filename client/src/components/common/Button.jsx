// Button — a single reusable button with brand-styled variants, so buttons look
// consistent everywhere instead of each page re-styling its own.
export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ' +
    'transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ' +
    'disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand-navy text-white hover:bg-brand-blue focus:ring-brand-blue',
    secondary:
      'bg-white text-brand-navy border border-gray-300 hover:bg-gray-50 ' +
      'dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600',
    success: 'bg-brand-green text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-brand-navy hover:bg-brand-light dark:text-gray-100 dark:hover:bg-gray-700',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
