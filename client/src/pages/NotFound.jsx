// NotFound — friendly 404 page so unknown URLs don't show a blank screen.
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Logo from '../components/common/Logo.jsx';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-light p-6 text-center dark:bg-gray-900">
      <Logo />
      <h1 className="text-5xl font-bold text-brand-navy dark:text-white">404</h1>
      <p className="text-gray-600 dark:text-gray-300">The page you're looking for doesn't exist.</p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
