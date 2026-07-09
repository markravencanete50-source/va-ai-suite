import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { DocResult } from "@/lib/webllm/docPrompts";
import {
  invoiceSubtotal,
  invoiceTax,
  invoiceTotal,
  money,
  type Invoice,
} from "@/lib/invoices/types";

const PULSE = "#5B6CE8";
const INK = "#1A222C";
const FOG = "#68788A";
const LINE = "#D9E0E8";

const ds = StyleSheet.create({
  page: { padding: 56, fontSize: 10.5, color: INK, fontFamily: "Helvetica", lineHeight: 1.5 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 11, color: FOG, marginBottom: 24 },
  heading: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: PULSE,
    marginTop: 16,
    marginBottom: 6,
  },
  body: { marginBottom: 4 },
  bullet: { flexDirection: "row", marginLeft: 10, marginBottom: 2 },
  bulletDot: { width: 12, color: PULSE },
  bulletText: { flex: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: PULSE, marginBottom: 20 },
});

function GeneratedDocPdf({ doc }: { doc: DocResult }) {
  return (
    <Document title={doc.title}>
      <Page size="A4" style={ds.page}>
        <Text style={ds.title}>{doc.title}</Text>
        <Text style={ds.subtitle}>{doc.subtitle}</Text>
        <View style={ds.rule} />
        {doc.sections.map((s, i) => (
          <View key={i} wrap={false}>
            <Text style={ds.heading}>{s.heading}</Text>
            <Text style={ds.body}>{s.body}</Text>
            {(s.bullets ?? []).map((b, j) => (
              <View key={j} style={ds.bullet}>
                <Text style={ds.bulletDot}>•</Text>
                <Text style={ds.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function docPdfBlob(doc: DocResult): Promise<Blob> {
  return pdf(<GeneratedDocPdf doc={doc} />).toBlob();
}

const is = StyleSheet.create({
  page: { padding: 56, fontSize: 10, color: INK, fontFamily: "Helvetica", lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  invoiceWord: { fontSize: 26, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  number: { color: PULSE, fontFamily: "Helvetica-Bold", marginTop: 4 },
  metaLabel: { fontSize: 8, color: FOG, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  party: { maxWidth: 220 },
  partyName: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  partyLine: { color: FOG },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: INK,
    paddingBottom: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 7,
  },
  colDesc: { flex: 1, paddingRight: 8 },
  colQty: { width: 50, textAlign: "right" },
  colRate: { width: 80, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  totals: { marginTop: 14, marginLeft: "auto", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grand: {
    borderTopWidth: 2,
    borderTopColor: PULSE,
    marginTop: 4,
    paddingTop: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  notes: { marginTop: 32, color: FOG },
  paid: {
    position: "absolute",
    top: 40,
    right: 56,
    color: "#2FA875",
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    transform: "rotate(-8deg)",
  },
});

function InvoicePdf({ inv }: { inv: Invoice }) {
  return (
    <Document title={`Invoice ${inv.number}`}>
      <Page size="A4" style={is.page}>
        {inv.status === "paid" && <Text style={is.paid}>PAID</Text>}
        <View style={is.header}>
          <View>
            <Text style={is.invoiceWord}>INVOICE</Text>
            <Text style={is.number}>{inv.number}</Text>
          </View>
          <View>
            <Text style={is.metaLabel}>Issued</Text>
            <Text>{inv.issued}</Text>
            <Text style={[is.metaLabel, { marginTop: 8 }]}>Due</Text>
            <Text>{inv.due}</Text>
          </View>
        </View>

        <View style={is.parties}>
          <View style={is.party}>
            <Text style={is.metaLabel}>From</Text>
            <Text style={is.partyName}>{inv.from.name}</Text>
            <Text style={is.partyLine}>{inv.from.email}</Text>
            <Text style={is.partyLine}>{inv.from.address}</Text>
          </View>
          <View style={is.party}>
            <Text style={is.metaLabel}>Bill to</Text>
            <Text style={is.partyName}>{inv.client.name}</Text>
            <Text style={is.partyLine}>{inv.client.email}</Text>
            <Text style={is.partyLine}>{inv.client.address}</Text>
          </View>
        </View>

        <View style={is.tableHead}>
          <Text style={is.colDesc}>Description</Text>
          <Text style={is.colQty}>Qty</Text>
          <Text style={is.colRate}>Rate</Text>
          <Text style={is.colAmount}>Amount</Text>
        </View>
        {inv.items.map((it, i) => (
          <View key={i} style={is.row}>
            <Text style={is.colDesc}>{it.description}</Text>
            <Text style={is.colQty}>{it.qty}</Text>
            <Text style={is.colRate}>{money(it.rate, inv.currency)}</Text>
            <Text style={is.colAmount}>{money(it.qty * it.rate, inv.currency)}</Text>
          </View>
        ))}

        <View style={is.totals}>
          <View style={is.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(invoiceSubtotal(inv), inv.currency)}</Text>
          </View>
          {inv.taxPct > 0 && (
            <View style={is.totalRow}>
              <Text>Tax ({inv.taxPct}%)</Text>
              <Text>{money(invoiceTax(inv), inv.currency)}</Text>
            </View>
          )}
          <View style={[is.totalRow, is.grand]}>
            <Text>Total due</Text>
            <Text>{money(invoiceTotal(inv), inv.currency)}</Text>
          </View>
        </View>

        {inv.notes ? <Text style={is.notes}>{inv.notes}</Text> : null}
      </Page>
    </Document>
  );
}

export async function invoicePdfBlob(inv: Invoice): Promise<Blob> {
  return pdf(<InvoicePdf inv={inv} />).toBlob();
}
