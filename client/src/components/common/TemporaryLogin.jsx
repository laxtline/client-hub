import Button from './Button.jsx';

export default function TemporaryLogin({ credentials, onClose }) {
  if (!credentials) return null;
  return (
    <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950 dark:text-gray-100">
      <h2 className="font-semibold">Temporary login — shown once</h2>
      <p className="mt-2 break-all text-sm">Email: {credentials.email}</p>
      <p className="mt-1 break-all text-sm">Temporary password: <code>{credentials.temporaryPassword}</code></p>
      <p className="my-3 text-sm">Share these details privately with the account owner. They must set a new password on their next login.</p>
      <Button variant="secondary" onClick={onClose}>I have saved the details</Button>
    </div>
  );
}
