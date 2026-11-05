import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InvoiceTable from './InvoiceTable.jsx';
import { invoiceApi } from '../../api/invoiceApi.js';
import { paymentApi } from '../../api/paymentApi.js';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('../../hooks/useToast.js', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../api/invoiceApi.js', () => ({ invoiceApi: { downloadPdf: vi.fn() } }));
vi.mock('../../api/paymentApi.js', () => ({ paymentApi: { simulate: vi.fn() } }));

const invoice = {
  id: 'i1',
  status: 'pending',
  totalAmount: 123.45,
  taxRate: 5,
  project: { title: 'Test Project' },
};
beforeEach(() => {
  vi.clearAllMocks();
});

describe('invoice actions', () => {
  it('displays current server data when the parent refetches', () => {
    const { rerender } = render(<InvoiceTable invoices={[invoice]} canPay />);
    expect(screen.getByRole('button', { name: 'Pay Now' })).toBeInTheDocument();
    rerender(<InvoiceTable invoices={[{ ...invoice, status: 'paid' }]} canPay />);
    expect(screen.queryByRole('button', { name: 'Pay Now' })).not.toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('starts a PDF download without showing an error toast', async () => {
    const blob = new Blob(['%PDF-1.3'], { type: 'application/pdf' });
    invoiceApi.downloadPdf.mockResolvedValue({ data: blob });
    URL.createObjectURL = vi.fn().mockReturnValue('blob:invoice');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<InvoiceTable invoices={[invoice]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(click.mock.instances[0].download).toBe('invoice-i1.pdf');
    expect(toast.error).not.toHaveBeenCalled();
    click.mockRestore();
  });

  it('shows the server message from a failed binary response', async () => {
    const errorBlob = new Blob([], { type: 'application/json' });
    errorBlob.text = async () => JSON.stringify({ message: 'Forbidden' });
    invoiceApi.downloadPdf.mockRejectedValue({ response: { data: errorBlob } });
    render(<InvoiceTable invoices={[invoice]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Forbidden'));
  });

  it('records one payment on repeated confirm clicks and refreshes the parent', async () => {
    let resolve;
    paymentApi.simulate.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const onPaid = vi.fn();
    render(<InvoiceTable invoices={[invoice]} canPay onPaid={onPaid} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pay Now' }));
    expect(screen.getByText('Includes 5% tax')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Pay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Processing...' }));
    expect(paymentApi.simulate).toHaveBeenCalledTimes(1);
    resolve({});
    await waitFor(() => expect(onPaid).toHaveBeenCalledOnce());
    expect(screen.queryByRole('button', { name: 'Pay Now' })).not.toBeInTheDocument();
  });
});
