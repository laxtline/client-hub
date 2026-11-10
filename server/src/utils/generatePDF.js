import PDFDocument from 'pdfkit';

export function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(22).fillColor('#1F355E').text('ClientHub', { continued: true });
    doc.fillColor('#2B6CB0').text('  INVOICE', { align: 'left' });
    doc.moveDown();

    doc.fontSize(10).fillColor('#333');
    doc.text(`Invoice ID: ${invoice.id}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`);
    doc.moveDown();

    doc.fontSize(12).fillColor('#1F355E').text('Bill To:');
    doc.fontSize(10).fillColor('#333');
    doc.text(invoice.client?.name || '—');
    if (invoice.client?.companyName) doc.text(invoice.client.companyName);
    if (invoice.project?.title) doc.text(`Project: ${invoice.project.title}`);
    doc.moveDown();

    const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    doc.fontSize(11).fillColor('#1F355E');
    // Keep the column positions fixed when the header is repeated.
    function tableHeader() {
      const y = doc.y;
      doc.fontSize(10).fillColor('#1F355E');
      doc.text('Description', 50, y, { width: 230 });
      doc.text('Qty', 290, y, { width: 45, align: 'right' });
      doc.text('Rate', 345, y, { width: 85, align: 'right' });
      doc.text('Amount (INR)', 440, y, { width: 105, align: 'right' });
      doc
        .moveTo(50, y + 16)
        .lineTo(545, y + 16)
        .stroke('#ccc');
      doc.y = y + 23;
      doc.fontSize(10).fillColor('#333');
    }
    tableHeader();

    let subtotal = 0;
    doc.fillColor('#333').fontSize(10);
    items.forEach((it) => {
      const amount = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
      subtotal += amount;
      let description = String(it.description || '-');
      let first = true;
      // Long descriptions may need more than one page.
      while (description.length) {
        let end = Math.min(description.length, 600);
        if (end < description.length) {
          const wordEnd = description.lastIndexOf(' ', end);
          if (wordEnd > 300) end = wordEnd;
        }
        const fragment = description.slice(0, end);
        description = description.slice(end).trimStart();
        const rowHeight = Math.max(16, doc.heightOfString(fragment, { width: 230 })) + 9;
        if (doc.y + rowHeight > doc.page.height - 50) {
          doc.addPage();
          doc
            .fontSize(10)
            .fillColor('#1F355E')
            .text(`Invoice ${invoice.id} - continued`, 50, 50, { width: 495 });
          doc.moveDown();
          tableHeader();
        }
        const y = doc.y;
        doc.text(fragment, 50, y, { width: 230 });
        if (first) {
          doc.text(String(it.quantity ?? ''), 290, y, { width: 45, align: 'right' });
          doc.text(Number(it.rate || 0).toFixed(2), 345, y, { width: 85, align: 'right' });
          doc.text(amount.toFixed(2), 440, y, { width: 105, align: 'right' });
        }
        doc.y = y + rowHeight;
        first = false;
      }
    });

    const tax = subtotal * ((Number(invoice.taxRate) || 0) / 100);
    const total = invoice.totalAmount ?? Math.round((subtotal + tax) * 100) / 100;
    if (doc.y + 110 > doc.page.height - 50) doc.addPage();
    doc.moveDown();
    doc.fontSize(10).fillColor('#333');
    doc.text(`Subtotal: ${subtotal.toFixed(2)}`, 50, doc.y, { width: 495, align: 'right' });
    doc.text(`Tax (${invoice.taxRate || 0}%): ${tax.toFixed(2)}`, 50, doc.y, {
      width: 495,
      align: 'right',
    });
    doc
      .fontSize(12)
      .fillColor('#1F355E')
      .text(`Total (INR): ${Number(total).toFixed(2)}`, 50, doc.y, { width: 495, align: 'right' });

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor('#888')
      .text('Thank you for your business - ClientHub', 50, doc.y, { width: 495, align: 'center' });

    doc.end();
  });
}
