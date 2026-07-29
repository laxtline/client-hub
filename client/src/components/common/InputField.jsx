// InputField — a labelled input/select/textarea with consistent styling and an
// optional error message. Keeps every form looking the same.
export default function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  as = 'input', // 'input' | 'textarea' | 'select'
  children, // <option>s when as="select"
  className = '',
  ...props
}) {
  const base =
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ' +
    'focus:ring-brand-blue dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 ' +
    `${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;

  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>}

      {as === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange} className={base} rows={3} {...props} />
      ) : as === 'select' ? (
        <select name={name} value={value} onChange={onChange} className={base} {...props}>
          {children}
        </select>
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} className={base} {...props} />
      )}

      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
