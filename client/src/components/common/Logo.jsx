// Logo — the ClientHub wordmark (a small "C" mark + name), so the app feels like
// a branded product rather than a bare template.
export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-blue font-bold text-white">
        C
      </span>
      <span className={`text-lg font-bold ${light ? 'text-white' : 'text-brand-navy dark:text-white'}`}>
        Client<span className="text-brand-blue">Hub</span>
      </span>
    </div>
  );
}
