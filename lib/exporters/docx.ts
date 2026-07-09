import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { DocResult } from "@/lib/webllm/docPrompts";

export async function docxBlob(doc: DocResult): Promise<Blob> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: doc.title, bold: true })],
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: doc.subtitle, italics: true, color: "666666" })],
    }),
  ];

  for (const section of doc.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: section.heading })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: section.body })],
      })
    );
    for (const bullet of section.bullets ?? []) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: bullet })],
        })
      );
    }
  }

  const file = new Document({ sections: [{ children }] });
  return Packer.toBlob(file);
}
