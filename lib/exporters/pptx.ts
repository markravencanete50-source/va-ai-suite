import PptxGenJS from "pptxgenjs";
import type { DocResult } from "@/lib/webllm/docPrompts";

// Brand tokens mirrored from tailwind.config.ts
const INK = "0F141A";
const PAPER = "E9EEF3";
const FOG = "94A3B3";
const PULSE = "7C8CF8";

export async function pptxFile(doc: DocResult, fileName: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";

  const title = pptx.addSlide();
  title.background = { color: INK };
  title.addShape("rect", { x: 0, y: 6.9, w: 13.33, h: 0.6, fill: { color: PULSE } });
  title.addText(doc.title, {
    x: 0.8, y: 2.4, w: 11.7, h: 1.6,
    fontFace: "Arial", fontSize: 40, bold: true, color: PAPER,
  });
  title.addText(doc.subtitle, {
    x: 0.8, y: 4.0, w: 11.7, h: 0.9,
    fontFace: "Arial", fontSize: 18, color: FOG,
  });

  doc.sections.forEach((section, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: INK };
    slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: PULSE } });
    slide.addText(`${String(i + 1).padStart(2, "0")}`, {
      x: 0.8, y: 0.5, w: 1.5, h: 0.5,
      fontFace: "Courier New", fontSize: 14, color: PULSE,
    });
    slide.addText(section.heading, {
      x: 0.8, y: 1.0, w: 11.7, h: 1.0,
      fontFace: "Arial", fontSize: 28, bold: true, color: PAPER,
    });
    slide.addText(section.body, {
      x: 0.8, y: 2.2, w: 11.7, h: 1.8,
      fontFace: "Arial", fontSize: 15, color: FOG, valign: "top",
    });
    if (section.bullets?.length) {
      slide.addText(
        section.bullets.map((b) => ({
          text: b,
          options: { bullet: { code: "2022" }, breakLine: true },
        })),
        {
          x: 0.8, y: 4.2, w: 11.7, h: 2.8,
          fontFace: "Arial", fontSize: 14, color: PAPER, valign: "top",
        }
      );
    }
  });

  await pptx.writeFile({ fileName });
}
