// Invoice business logic: total calculation and line-item suggestion.
// Kept out of the controller so it can be unit-tested and reused.
import prisma from '../config/db.js';

/**
 * Compute the total amount of an invoice from its line items + tax.
 * @param {Array<{quantity:number, rate:number}>} lineItems
 * @param {number} taxRate - percentage, e.g. 18 for 18%
 * @returns {number} total rounded to 2 decimals
 */
export function calculateInvoiceTotal(lineItems = [], taxRate = 0) {
  const subtotal = lineItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
  );
  const total = subtotal + subtotal * ((Number(taxRate) || 0) / 100);
  return Math.round(total * 100) / 100;
}

/**
 * Suggest invoice line items from logged hours on a project's tasks.
 * Each task with hours becomes a line item (description = task title).
 * @param {string} projectId
 * @returns {Promise<Array<{description, quantity, rate}>>}
 */
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
