// InvoiceForm — admin builder for a new invoice. Supports multiple line items
// (description, quantity, rate), a tax rate, an auto-calculated total, and a
// "suggest from logged hours" helper that calls the backend. The total math here
// mirrors the server's calculateInvoiceTotal so the preview matches the saved value.
import { useEffect, useState } from 'react';
import { invoiceApi } from '../../api/invoiceApi.js';
import { projectApi } from '../../api/projectApi.js';
import Button from '../common/Button.jsx';
import InputField from '../common/InputField.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

const EMPTY_ITEM = { description: '', quantity: 1, rate: 0 };

export default function InvoiceForm({ onCreated, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [taxRate, setTaxRate] = useState(18);
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load projects to pick which one the invoice belongs to.
  useEffect(() => {
    projectApi
      .list({ limit: 100 })
      .then(({ data }) => setProjects(data.projects))
      .catch(() => setProjects([]));
  }, []);

  // Subtotal + tax = grand total (same formula as the server).
  const subtotal = lineItems.reduce((s, i) => s + Number(i.quantity) * Number(i.rate), 0);
  const total = subtotal + (subtotal * Number(taxRate)) / 100;

  function updateItem(index, field, value) {
    setLineItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }
  const addItem = () => setLineItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  // Ask the backend to suggest line items from hours logged on the project's tasks.
  async function suggest() {
    if (!projectId) return;
    const { data } = await invoiceApi.suggest(projectId);
    if (data.lineItems?.length) setLineItems(data.lineItems);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const project = projects.find((p) => p.id === projectId);
    if (!project) return setError('Please select a project.');

    setSaving(true);
    try {
      // The invoice is linked to the project's client automatically.
      await invoiceApi.create({
        projectId,
        clientId: project.clientId,
        lineItems: lineItems.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
        })),
        taxRate: Number(taxRate),
        dueDate: dueDate || null,
      });
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create invoice.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <InputField
          label="Project"
          as="select"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </InputField>
        <InputField
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {/* Line items */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Line items</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={suggest} disabled={!projectId}>
              Suggest from hours
            </Button>
            <Button type="button" variant="secondary" onClick={addItem}>
              + Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                aria-label="Quantity"
                className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <input
                type="number"
                min="0"
                value={item.rate}
                onChange={(e) => updateItem(i, 'rate', e.target.value)}
                aria-label="Rate"
                className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              {lineItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="px-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label="Remove line item"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between">
        <InputField
          label="Tax %"
          type="number"
          min="0"
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          className="w-28"
        />
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total (incl. tax)</p>
          <p className="text-xl font-bold text-brand-navy dark:text-white">{formatCurrency(total)}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
