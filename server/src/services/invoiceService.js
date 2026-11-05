import prisma from '../config/db.js';

export function calculateInvoiceTotal(lineItems = [], taxRate = 0) {
  const subtotal = lineItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
  );
  const total = subtotal + subtotal * ((Number(taxRate) || 0) / 100);
  return Math.round(total * 100) / 100;
}

export async function suggestLineItemsFromHours(projectId, hourlyRate = 50) {
  const tasks = await prisma.task.findMany({
    where: { projectId, hoursLogged: { gt: 0 } },
    select: { title: true, hoursLogged: true },
  });
  return tasks.map((t) => ({
    description: `${t.title} (logged hours)`,
    quantity: t.hoursLogged,
    rate: hourlyRate,
  }));
}
