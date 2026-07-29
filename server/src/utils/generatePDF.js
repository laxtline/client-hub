// Generates an invoice PDF in-memory using pdfkit and returns it as a Buffer.
// WHY a Buffer: lets the controller stream it to the browser as a download
// without writing temporary files to disk.
import PDFDocument from 'pdfkit';

/**
 * Build a PDF buffer for a single invoice.
 * @param {object} invoice - invoice with line items, client and project
 * @returns {Promise<Buffer>}
 */
export function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ----- Header -----
    doc.fontSize(22).fillColor('#1F355E').text('ClientHub', { continued: true });
    doc.fillColor('#2B6CB0').text('  INVOICE', { align: 'left' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#333');
    doc.text(`Invoice ID: ${invoice.id}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`);
    doc.moveDown();

    // ----- Bill to -----
    doc.fontSize(12).fillColor('#1F355E').text('Bill To:');
    doc.fontSize(10).fillColor('#333');
    doc.text(invoice.client?.name || '—');
    if (invoice.client?.companyName) doc.text(invoice.client.companyName);
    if (invoice.project?.title) doc.text(`Project: ${invoice.project.title}`);
    doc.moveDown();

    // ----- Line items table -----
    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    doc.fontSize(11).fillColor('#1F355E');
    // Header cells use explicit x positions like the data rows below;
    // `continued: true` would make pdfkit ignore them and flow inline.
    const headerY = doc.y;
    doc.text('Description', 50, headerY, { width: 250 });
    doc.text('Qty', 300, headerY, { width: 60 });
    doc.text('Rate', 360, headerY, { width: 80 });
    doc.text('Amount', 450, headerY);
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#ccc');
    doc.moveDown(0.5);

    let subtotal = 0;
    doc.fillColor('#333').fontSize(10);
    items.forEach((it) => {
      const amount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
      subtotal += amount;
      const y = doc.y;
      doc.text(it.description || '—', 50, y, { width: 250 });
      doc.text(String(it.quantity ?? ''), 300, y, { width: 60 });
      doc.text(String(it.rate ?? ''), 360, y, { width: 80 });
      doc.text(amount.toFixed(2), 450, y);
      doc.moveDown(0.3);
    });

    // ----- Totals -----
    const tax = subtotal * ((Number(invoice.taxRate) || 0) / 100);
    const total = subtotal + tax;
    doc.moveDown();
    doc.fontSize(10).fillColor('#333');
    doc.text(`Subtotal: ${subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`Tax (${invoice.taxRate || 0}%): ${tax.toFixed(2)}`, { align: 'right' });
    doc.fontSize(12).fillColor('#1F355E').text(`Total: ${total.toFixed(2)}`, { align: 'right' });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888').text('Thank you for your business — ClientHub', { align: 'center' });

    doc.end();
  });
}
