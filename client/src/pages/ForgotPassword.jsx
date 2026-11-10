import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow dark:bg-gray-800 dark:text-white">
        <h1 className="text-xl font-bold">Need help signing in?</h1>
        <p className="text-sm">Account banwane ya password reset karwane ke liye apne agency administrator se contact karein.</p>
        <p className="text-sm">Your administrator can issue a temporary password. Public demo passwords cannot be changed or reset.</p>
        <Link to="/login" className="inline-block text-sm text-brand-blue hover:underline">Back to login</Link>
      </div>
    </div>
  );
}
