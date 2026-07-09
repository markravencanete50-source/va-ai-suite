export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id?: string;
  number: string;
  from: { name: string; email: string; address: string };
  client: { name: string; email: string; address: string };
  items: InvoiceItem[];
  currency: string;
  taxPct: number;
  issued: string; // yyyy-mm-dd
  due: string; // yyyy-mm-dd
  notes: string;
  status: "draft" | "sent" | "paid";
}

export function invoiceSubtotal(inv: Invoice) {
  return inv.items.reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);
}

export function invoiceTax(inv: Invoice) {
  return invoiceSubtotal(inv) * ((inv.taxPct || 0) / 100);
}

export function invoiceTotal(inv: Invoice) {
  return invoiceSubtotal(inv) + invoiceTax(inv);
}

export function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}
