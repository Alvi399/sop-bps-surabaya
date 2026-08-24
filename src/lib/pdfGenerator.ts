// src/lib/pdfGenerator.ts
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface FlowchartStep {
  no: number;
  aktivitas: string;
  pelaksana: { [key: string]: boolean };
  mutuBaku: {
    persyaratan: string;
    output: string;
    waktu: string;
  };
  keterangan: string;
  shapes?: { [pelaksana: string]: string }; // Map of pelaksana name -> shape
  shapeText?: { [pelaksana: string]: string } | string; // Text label inside shape
  decisionBranch?: {
    toStep?: number;
    labelYes?: string;
    labelNo?: string;
  };
}

interface SymbolBounds {
  halfW: number;
  halfH: number;
  top: { x: number; y: number };
  bottom: { x: number; y: number };
  left: { x: number; y: number };
  right: { x: number; y: number };
}

interface DynamicSymbolDims {
  width: number;
  height: number;
  halfW: number;
  halfH: number;
  lines: string[];
  fontSize: number;
}

// Calculate dynamic symbol dimensions and wrapped lines based on text content
function getDynamicSymbolDims(
  symbol: string,
  label: string,
  maxAvailW: number,
  fontBold: PDFFont
): DynamicSymbolDims {
  const fontSize = 5.8;
  const cleanLabel = (label || "").trim();

  if (!cleanLabel) {
    const defW = symbol === "oval" ? 38 : symbol === "diamond" ? 30 : 34;
    const defH = symbol === "diamond" ? 24 : 18;
    return {
      width: defW,
      height: defH,
      halfW: defW / 2,
      halfH: defH / 2,
      lines: [],
      fontSize,
    };
  }

  const singleW = fontBold.widthOfTextAtSize(cleanLabel, fontSize);
  const maxShapeW = Math.max(36, maxAvailW - 8);

  // If text fits in single line within max shape width:
  if (singleW + 10 <= maxShapeW) {
    const shapeW = Math.max(36, singleW + 10);
    const shapeH = symbol === "diamond" ? Math.max(24, shapeW * 0.6) : 18;
    return {
      width: shapeW,
      height: shapeH,
      halfW: shapeW / 2,
      halfH: shapeH / 2,
      lines: [cleanLabel],
      fontSize,
    };
  }

  // Wrap text into multiple lines
  const targetW = maxShapeW - 8;
  const words = cleanLabel.split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (fontBold.widthOfTextAtSize(test, fontSize) > targetW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);

  let maxW = 0;
  for (const l of lines) {
    const lw = fontBold.widthOfTextAtSize(l, fontSize);
    if (lw > maxW) maxW = lw;
  }

  const shapeW = Math.min(maxShapeW, Math.max(36, maxW + 10));
  const lineSpacing = fontSize * 1.25;
  const contentH = lines.length * lineSpacing;
  const shapeH = symbol === "diamond" 
    ? Math.max(contentH + 16, shapeW * 0.7) 
    : Math.max(20, contentH + 8);

  return {
    width: shapeW,
    height: shapeH,
    halfW: shapeW / 2,
    halfH: shapeH / 2,
    lines,
    fontSize,
  };
}

// Draw crisp vector symbols with centered text
async function drawFlowchartSymbol(
  page: PDFPage,
  centerX: number,
  centerY: number,
  symbol: string,
  dims: DynamicSymbolDims,
  fontBold: PDFFont,
  customImageBytes?: Uint8Array
) {
  const { halfW, halfH, lines, fontSize } = dims;

  switch (symbol) {
    case "oval": // Start / End
      page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: halfW,
        yScale: halfH,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.2,
      });
      break;

    case "rectangle": // Process
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.2,
      });
      break;

    case "diamond": // Decision / Validation
      {
        const top = { x: centerX, y: centerY + halfH };
        const right = { x: centerX + halfW, y: centerY };
        const bottom = { x: centerX, y: centerY - halfH };
        const left = { x: centerX - halfW, y: centerY };
        const diamondSvg = `M ${top.x} ${top.y} L ${right.x} ${right.y} L ${bottom.x} ${bottom.y} L ${left.x} ${left.y} Z`;
        page.drawSvgPath(diamondSvg, {
          color: rgb(1, 1, 1),
          borderColor: rgb(0, 0, 0),
          borderWidth: 1.2,
        });
      }
      break;

    case "database": // Database / Storage
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.2,
      });
      // Cylinder top cap
      page.drawEllipse({
        x: centerX,
        y: centerY + halfH - 2,
        xScale: halfW,
        yScale: 2.5,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      break;

    case "document": // Document Output
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.2,
      });
      // Wave curve indicator at bottom
      page.drawLine({
        start: { x: centerX - halfW, y: centerY - halfH + 3 },
        end: { x: centerX + halfW, y: centerY - halfH + 3 },
        color: rgb(0, 0, 0),
        thickness: 0.8,
      });
      break;

    default:
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: rgb(1, 1, 1),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.2,
      });
      break;
  }

  // Draw custom image overlay if present
  if (customImageBytes && symbol === "custom") {
    try {
      const pdfDoc = page.doc;
      let img;
      try {
        img = await pdfDoc.embedPng(customImageBytes);
      } catch {
        img = await pdfDoc.embedJpg(customImageBytes);
      }
      const imgDims = img.scale(16 / Math.max(img.width, img.height));
      page.drawImage(img, {
        x: centerX - imgDims.width / 2,
        y: centerY - imgDims.height / 2,
        width: imgDims.width,
        height: imgDims.height,
      });
    } catch (e) {
      console.error("Failed to embed custom image:", e);
    }
  }

  // Render centered multi-line text inside shape
  if (lines && lines.length > 0) {
    const lineSpacing = fontSize * 1.25;
    const startY = centerY + (lines.length - 1) * (lineSpacing / 2) - fontSize / 2.8;

    lines.forEach((l, idx) => {
      const textWidth = fontBold.widthOfTextAtSize(l, fontSize);
      page.drawText(l, {
        x: centerX - textWidth / 2,
        y: startY - idx * lineSpacing,
        size: fontSize,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    });
  }
}

// Arrowhead Drawing Helpers
function drawDownArrowHead(page: PDFPage, x: number, y: number, size = 4.5) {
  const path = `M ${x} ${y} L ${x - size * 0.7} ${y + size * 1.2} L ${x + size * 0.7} ${y + size * 1.2} Z`;
  page.drawSvgPath(path, {
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

function drawRightArrowHead(page: PDFPage, x: number, y: number, size = 4.5) {
  const path = `M ${x} ${y} L ${x - size * 1.2} ${y + size * 0.7} L ${x - size * 1.2} ${y - size * 0.7} Z`;
  page.drawSvgPath(path, {
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

function drawLeftArrowHead(page: PDFPage, x: number, y: number, size = 4.5) {
  const path = `M ${x} ${y} L ${x + size * 1.2} ${y + size * 0.7} L ${x + size * 1.2} ${y - size * 0.7} Z`;
  page.drawSvgPath(path, {
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

// Orthogonal Swimlane Connector between Step A and Step B
function drawOrthogonalConnection(
  page: PDFPage,
  fromBounds: SymbolBounds,
  toBounds: SymbolBounds
) {
  const startX = fromBounds.bottom.x;
  const startY = fromBounds.bottom.y;
  const endX = toBounds.top.x;
  const endY = toBounds.top.y;
  const arrowSize = 4.5;
  const thickness = 1.3;

  if (Math.abs(startX - endX) < 4) {
    // Straight vertical line down
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY + arrowSize * 1.1 },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawDownArrowHead(page, endX, endY, arrowSize);
  } else {
    // Elbow routing distinctly in whitespace below fromShape
    const elbowY = startY - 5;

    // 1. Drop down from fromShape to elbowY
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: startX, y: elbowY },
      color: rgb(0, 0, 0),
      thickness,
    });
    // 2. Horizontal segment across columns (completely continuous and visible)
    page.drawLine({
      start: { x: startX, y: elbowY },
      end: { x: endX, y: elbowY },
      color: rgb(0, 0, 0),
      thickness,
    });
    // 3. Drop down from elbowY directly to top of toShape
    page.drawLine({
      start: { x: endX, y: elbowY },
      end: { x: endX, y: endY + arrowSize * 1.1 },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawDownArrowHead(page, endX, endY, arrowSize);
  }
}

// Horizontal Connector within the same step
function drawHorizontalStepConnection(
  page: PDFPage,
  fromBounds: SymbolBounds,
  toBounds: SymbolBounds
) {
  const isRight = toBounds.left.x > fromBounds.right.x;
  const arrowSize = 4.5;
  const thickness = 1.3;

  if (isRight) {
    page.drawLine({
      start: { x: fromBounds.right.x, y: fromBounds.right.y },
      end: { x: toBounds.left.x - arrowSize * 1.1, y: toBounds.left.y },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawRightArrowHead(page, toBounds.left.x, toBounds.left.y, arrowSize);
  } else {
    page.drawLine({
      start: { x: fromBounds.left.x, y: fromBounds.left.y },
      end: { x: toBounds.right.x + arrowSize * 1.1, y: toBounds.right.y },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawLeftArrowHead(page, toBounds.right.x, toBounds.right.y, arrowSize);
  }
}

// Helper to determine flowchart symbol for a specific pelaksana in a step
function determineSymbol(step: FlowchartStep, pelaksanaName: string, stepIdx: number, totalSteps: number): string {
  if (step.shapes && step.shapes[pelaksanaName] && step.shapes[pelaksanaName] !== "auto") {
    return step.shapes[pelaksanaName];
  }

  const aktivitas = (step.aktivitas || "").toLowerCase();
  
  if (stepIdx === 0) return "oval";
  if (stepIdx === totalSteps - 1) return "oval";
  
  if (aktivitas.includes("validasi") || 
      aktivitas.includes("cek") || 
      aktivitas.includes("verifikasi") ||
      aktivitas.includes("review") ||
      aktivitas.includes("setuju") ||
      aktivitas.includes("evaluasi")) {
    return "diamond";
  }
  
  if (aktivitas.includes("backup") || 
      aktivitas.includes("simpan") ||
      aktivitas.includes("database") ||
      aktivitas.includes("arsip") ||
      aktivitas.includes("input")) {
    return "database";
  }
  
  if (aktivitas.includes("cetak") || 
      aktivitas.includes("print") ||
      aktivitas.includes("laporan") ||
      aktivitas.includes("berkas") ||
      aktivitas.includes("surat") ||
      aktivitas.includes("dokumen")) {
    return "document";
  }
  
  return "rectangle";
}

// Helper to determine text label inside symbol
function determineSymbolLabel(step: FlowchartStep, pelaksanaName: string, symbol: string, stepIdx: number, totalSteps: number): string {
  if (typeof step.shapeText === "string" && step.shapeText.trim() !== "") {
    return step.shapeText.trim();
  }
  if (typeof step.shapeText === "object" && step.shapeText && step.shapeText[pelaksanaName]) {
    return step.shapeText[pelaksanaName].trim();
  }

  // Auto-labels based on symbol & index
  if (stepIdx === 0) return "Mulai";
  if (stepIdx === totalSteps - 1) return "Selesai";
  if (symbol === "diamond") return "Validasi";
  if (symbol === "document") return "Dokumen";
  if (symbol === "database") return "Simpan";
  return "Proses";
}

// Helper function for word wrapping
function wrapText(
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number
): string[] {
  if (!text || text.trim() === "") return ["-"];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : ["-"];
}

export default async function generateSOPPdf(params: {
  nomor: string;
  namaSop: string;
  tanggalPembuatan: string;
  tanggalRevisi: string;
  tanggalEfektif: string;
  dasarHukum?: string;
  kualifikasiPelaksana?: string;
  keterkaitan?: string;
  peralatanPerlengkapan?: string;
  peringatan?: string;
  pencatatanPendataan?: string;
  maksud?: string;
  tujuan?: string;
  flowchartSteps?: FlowchartStep[];
  pelaksanaColumns?: string[];
  customShapeImages?: { [stepIndex: number]: Uint8Array };
  finalAction?: string;
}): Promise<Uint8Array> {
  try {
    console.log("🔵 Loading PDF template...");

    const templateBytes = await fetch("/templates/sop_template.pdf").then((r) =>
      r.arrayBuffer()
    );

    const pdfDoc = await PDFDocument.load(templateBytes);
    const page1 = pdfDoc.getPage(0);

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const {
      nomor,
      namaSop,
      tanggalPembuatan,
      tanggalRevisi,
      tanggalEfektif,
      dasarHukum = "",
      kualifikasiPelaksana = "",
      keterkaitan = "",
      peralatanPerlengkapan = "",
      peringatan = "",
      pencatatanPendataan = "",
      maksud = "",
      tujuan = "",
      flowchartSteps = [],
      pelaksanaColumns = [],
    } = params;
    const customShapeImages = params.customShapeImages || {};

    // ========================================
    // PAGE 1: COVER / HEADER (COP)
    // ========================================
    const write = (
      page: PDFPage,
      text: string,
      x: number,
      y: number,
      size = 10,
      bold = false,
      lineHeight = 1.2
    ) => {
      if (!text || text === "-") {
        page.drawText("-", {
          x,
          y,
          size,
          font: bold ? fontBold : fontRegular,
          color: rgb(0, 0, 0),
        });
        return;
      }

      const lines = text.split("\n");
      const lineSpacing = size * lineHeight;

      lines.forEach((line, index) => {
        page.drawText(line, {
          x,
          y: y - index * lineSpacing,
          size,
          font: bold ? fontBold : fontRegular,
          color: rgb(0, 0, 0),
        });
      });
    };

    // Header fields
    write(page1, nomor, 590, 535, 10);
    write(page1, tanggalPembuatan, 590, 523, 10);
    write(page1, tanggalRevisi || "-", 590, 511, 10);
    write(page1, tanggalEfektif, 590, 498, 10);

    // Center title
    const judulWidth = fontBold.widthOfTextAtSize(namaSop, 12);
    const centerX = (page1.getWidth() - judulWidth) / 2;
    write(page1, namaSop, centerX, 405, 12, true);

    // Section fields
    write(page1, dasarHukum, 104, 369, 10, false, 1.2);
    write(page1, kualifikasiPelaksana, 495, 369, 10, false, 1.3);
    write(page1, keterkaitan, 104, 287, 10);
    write(page1, peralatanPerlengkapan, 495, 290, 10, false, 1.2);
    write(page1, peringatan, 105, 197, 10);
    write(page1, pencatatanPendataan, 495, 197, 10);
    write(page1, maksud, 140, 147, 10, false, 1.4);
    write(page1, tujuan, 140, 107, 10, false, 1.4);

    console.log("✅ Page 1 (COP) completed");

    // ========================================
    // PAGE 2: FLOWCHART TABLE
    // ========================================
    if (flowchartSteps.length > 0 && pelaksanaColumns.length > 0) {
      console.log("🔵 Creating Page 2 (Flowchart Table)...");

      const page2 = pdfDoc.addPage([937, 595]);
      const { width, height } = page2.getSize();

      const margin = 25;
      const tableWidth = width - 2 * margin;
      const tableTop = height - 50;

      const colNo = 25;
      const colAktivitas = 175;
      const colMutuBakuTotal = 180;
      const colMutuBakuPer = colMutuBakuTotal / 3;
      const colKeterangan = 100;
      const pelaksanaWidth = tableWidth - colNo - colAktivitas - colMutuBakuTotal - colKeterangan;
      const colWidthPerPelaksana = pelaksanaWidth / pelaksanaColumns.length;

      const headerHeight = 55;

      // ===== 1. CALCULATE DYNAMIC ROW HEIGHTS =====
      const calculatedRowHeights = flowchartSteps.map((step, stepIdx) => {
        let requiredH = 44; // base minimum row height

        // Height needed for Aktivitas text
        const aktLines = wrapText(step.aktivitas, colAktivitas - 10, fontRegular, 8);
        const aktH = aktLines.length * 11 + 16;
        if (aktH > requiredH) requiredH = aktH;

        // Height needed for Shapes in this row
        pelaksanaColumns.forEach((col) => {
          if (step.pelaksana[col]) {
            const symbol = determineSymbol(step, col, stepIdx, flowchartSteps.length);
            const label = determineSymbolLabel(step, col, symbol, stepIdx, flowchartSteps.length);
            const dims = getDynamicSymbolDims(symbol, label, colWidthPerPelaksana, fontBold);
            const shapeNeededH = dims.height + 20;
            if (shapeNeededH > requiredH) requiredH = shapeNeededH;
          }
        });

        // Height needed for Mutu Baku
        const mbLines1 = wrapText(step.mutuBaku.persyaratan, colMutuBakuPer - 6, fontRegular, 8);
        const mbLines2 = wrapText(step.mutuBaku.output, colMutuBakuPer - 6, fontRegular, 8);
        const mbLines3 = wrapText(step.mutuBaku.waktu, colMutuBakuPer - 6, fontRegular, 8);
        const mbMaxLines = Math.max(mbLines1.length, mbLines2.length, mbLines3.length);
        const mbH = mbMaxLines * 11 + 16;
        if (mbH > requiredH) requiredH = mbH;

        // Height needed for Keterangan
        const ketLines = wrapText(step.keterangan, colKeterangan - 8, fontRegular, 8);
        const ketH = ketLines.length * 11 + 16;
        if (ketH > requiredH) requiredH = ketH;

        return Math.ceil(requiredH);
      });

      const totalRowsHeight = calculatedRowHeights.reduce((acc, h) => acc + h, 0);

      // Draw table outer container
      page2.drawRectangle({
        x: margin,
        y: tableTop - headerHeight - totalRowsHeight,
        width: tableWidth,
        height: headerHeight + totalRowsHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // ===== HEADER ROW =====
      let currentX = margin;
      let currentY = tableTop;

      // Header: No
      page2.drawRectangle({
        x: currentX,
        y: currentY - headerHeight,
        width: colNo,
        height: headerHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.98),
      });
      write(page2, "No", currentX + 5, currentY - 25, 9, true);
      currentX += colNo;

      // Header: Aktivitas
      page2.drawRectangle({
        x: currentX,
        y: currentY - headerHeight,
        width: colAktivitas,
        height: headerHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.98),
      });
      write(page2, "Aktivitas", currentX + 8, currentY - 25, 9, true);
      currentX += colAktivitas;

      // Header: Pelaksana (main top)
      const pelaksanaStartX = currentX;
      page2.drawRectangle({
        x: currentX,
        y: currentY - 25,
        width: pelaksanaWidth,
        height: 25,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.95, 0.96, 0.99),
      });
      const pelLabelWidth = fontBold.widthOfTextAtSize("Pelaksana", 9);
      write(page2, "Pelaksana", currentX + (pelaksanaWidth - pelLabelWidth) / 2, currentY - 17, 9, true);

      // Sub-headers Pelaksana (bottom)
      pelaksanaColumns.forEach((col, idx) => {
        const subX = pelaksanaStartX + idx * colWidthPerPelaksana;
        page2.drawRectangle({
          x: subX,
          y: currentY - headerHeight,
          width: colWidthPerPelaksana,
          height: headerHeight - 25,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          color: rgb(0.97, 0.97, 0.98),
        });

        const words = col.split(" ");
        let line = "";
        let lineY = currentY - 37;

        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          const textWidth = fontBold.widthOfTextAtSize(testLine, 7);

          if (textWidth > colWidthPerPelaksana - 4 && line) {
            write(page2, line, subX + 3, lineY, 7, true);
            line = word;
            lineY -= 8.5;
          } else {
            line = testLine;
          }
        }
        if (line) {
          write(page2, line, subX + 3, lineY, 7, true);
        }
      });

      currentX += pelaksanaWidth;

      // Header: Mutu Baku (main top)
      const mutuBakuStartX = currentX;
      page2.drawRectangle({
        x: currentX,
        y: currentY - 25,
        width: colMutuBakuTotal,
        height: 25,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.95, 0.96, 0.99),
      });
      const mbLabelWidth = fontBold.widthOfTextAtSize("Mutu Baku", 9);
      write(page2, "Mutu Baku", currentX + (colMutuBakuTotal - mbLabelWidth) / 2, currentY - 17, 9, true);

      // Sub-headers Mutu Baku (bottom)
      const mutuBakuHeaders = ["Persyaratan/\nKelengkapan", "Output", "Waktu"];
      mutuBakuHeaders.forEach((header, idx) => {
        const subX = mutuBakuStartX + idx * colMutuBakuPer;
        page2.drawRectangle({
          x: subX,
          y: currentY - headerHeight,
          width: colMutuBakuPer,
          height: headerHeight - 25,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          color: rgb(0.97, 0.97, 0.98),
        });

        const lines = header.split("\n");
        lines.forEach((line, lineIdx) => {
          write(page2, line, subX + 4, currentY - 37 - lineIdx * 9, 7.5, true);
        });
      });

      currentX += colMutuBakuTotal;

      // Header: Keterangan
      page2.drawRectangle({
        x: currentX,
        y: currentY - headerHeight,
        width: colKeterangan,
        height: headerHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
        color: rgb(0.97, 0.97, 0.98),
      });
      write(page2, "Keterangan", currentX + 8, currentY - 25, 9, true);

      // ===== DATA ROWS & GRID SETUP =====
      currentY = tableTop - headerHeight;

      interface StepShapeData {
        colIdx: number;
        cx: number;
        cy: number;
        symbol: string;
        label: string;
        dims: DynamicSymbolDims;
        bounds: SymbolBounds;
        stepIndex: number;
      }

      const allStepShapes: StepShapeData[][] = [];

      for (let stepIdx = 0; stepIdx < flowchartSteps.length; stepIdx++) {
        const step = flowchartSteps[stepIdx];
        const rowH = calculatedRowHeights[stepIdx];
        currentX = margin;
        const rowTopY = currentY;

        // No
        page2.drawRectangle({
          x: currentX,
          y: rowTopY - rowH,
          width: colNo,
          height: rowH,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.8,
        });
        write(page2, String(step.no), currentX + 8, rowTopY - 20, 8.5, false);
        currentX += colNo;

        // Aktivitas
        page2.drawRectangle({
          x: currentX,
          y: rowTopY - rowH,
          width: colAktivitas,
          height: rowH,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.8,
        });
        const aktivitasLines = wrapText(step.aktivitas, colAktivitas - 10, fontRegular, 8);
        aktivitasLines.forEach((line, lineIdx) => {
          write(page2, line, currentX + 5, rowTopY - 14 - lineIdx * 10, 8, false);
        });
        currentX += colAktivitas;

        // Pelaksana Grid Cells & Record Active Shape Positions
        const currentStepShapes: StepShapeData[] = [];

        for (let colIdx = 0; colIdx < pelaksanaColumns.length; colIdx++) {
          const colName = pelaksanaColumns[colIdx];
          const subX = currentX + colIdx * colWidthPerPelaksana;

          page2.drawRectangle({
            x: subX,
            y: rowTopY - rowH,
            width: colWidthPerPelaksana,
            height: rowH,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.8,
          });

          if (step.pelaksana[colName]) {
            const cx = subX + colWidthPerPelaksana / 2;
            const cy = rowTopY - rowH / 2;
            const symbol = determineSymbol(step, colName, stepIdx, flowchartSteps.length);
            const label = determineSymbolLabel(step, colName, symbol, stepIdx, flowchartSteps.length);
            const dims = getDynamicSymbolDims(symbol, label, colWidthPerPelaksana, fontBold);

            const bounds: SymbolBounds = {
              halfW: dims.halfW,
              halfH: dims.halfH,
              top: { x: cx, y: cy + dims.halfH },
              bottom: { x: cx, y: cy - dims.halfH },
              left: { x: cx - dims.halfW, y: cy },
              right: { x: cx + dims.halfW, y: cy },
            };

            currentStepShapes.push({
              colIdx,
              cx,
              cy,
              symbol,
              label,
              dims,
              bounds,
              stepIndex: stepIdx,
            });
          }
        }

        allStepShapes.push(currentStepShapes);
        currentX += pelaksanaWidth;

        // Mutu Baku Cells
        const mutuBakuValues = [
          step.mutuBaku.persyaratan,
          step.mutuBaku.output,
          step.mutuBaku.waktu,
        ];

        mutuBakuValues.forEach((val, idx) => {
          const subX = currentX + idx * colMutuBakuPer;
          page2.drawRectangle({
            x: subX,
            y: rowTopY - rowH,
            width: colMutuBakuPer,
            height: rowH,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.8,
          });

          const lines = wrapText(val, colMutuBakuPer - 6, fontRegular, 8);
          lines.forEach((line, lineIdx) => {
            write(page2, line, subX + 4, rowTopY - 14 - lineIdx * 10, 8, false);
          });
        });

        currentX += colMutuBakuTotal;

        // Keterangan Cell
        page2.drawRectangle({
          x: currentX,
          y: rowTopY - rowH,
          width: colKeterangan,
          height: rowH,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.8,
        });
        const ketLines = wrapText(step.keterangan, colKeterangan - 8, fontRegular, 8);
        ketLines.forEach((line, lineIdx) => {
          write(page2, line, currentX + 5, rowTopY - 14 - lineIdx * 10, 8, false);
        });

        currentY -= rowH;
      }

      // ===== DRAW ORTHOGONAL CONNECTING ARROWS FIRST (UNDER SHAPES) =====
      for (let i = 0; i < allStepShapes.length; i++) {
        const currentShapes = allStepShapes[i];

        // 1. Horizontal flow within same step if multiple executors
        if (currentShapes.length > 1) {
          for (let j = 0; j < currentShapes.length - 1; j++) {
            drawHorizontalStepConnection(page2, currentShapes[j].bounds, currentShapes[j + 1].bounds);
          }
        }

        // 2. Connect from current step to next step
        if (i < allStepShapes.length - 1) {
          const nextShapes = allStepShapes[i + 1];
          if (currentShapes.length > 0 && nextShapes.length > 0) {
            // Source = last executor in current row
            const sourceShape = currentShapes[currentShapes.length - 1];
            // Target = first executor in next row
            const targetShape = nextShapes[0];

            drawOrthogonalConnection(
              page2,
              sourceShape.bounds,
              targetShape.bounds
            );
          }
        }
      }

      // ===== DRAW SHAPES & LABELS ON TOP OF LINES (CRISP & CLEAN) =====
      for (let i = 0; i < allStepShapes.length; i++) {
        for (const shapeData of allStepShapes[i]) {
          await drawFlowchartSymbol(
            page2,
            shapeData.cx,
            shapeData.cy,
            shapeData.symbol,
            shapeData.dims,
            fontBold,
            customShapeImages[i]
          );
        }
      }

      // ===== FINAL ACTION CONTINUATION BOX (IF ANY) =====
      const finalAction = params.finalAction || "none";
      if (finalAction !== "none" && allStepShapes.length > 0) {
        const lastRowShapes = allStepShapes[allStepShapes.length - 1];
        if (lastRowShapes.length > 0) {
          const lastExec = lastRowShapes[lastRowShapes.length - 1];
          const finalY = lastExec.cy - 44;
          const label = finalAction === "organisasi" ? "Diagram Organisasi" : 
                        finalAction === "workflow" ? "Diagram Alur Kerja" : "Diagram Lanjutan";
          
          const boxWidth = 95;
          const boxHeight = 18;

          page2.drawRectangle({
            x: lastExec.cx - boxWidth / 2,
            y: finalY - boxHeight / 2,
            width: boxWidth,
            height: boxHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
            color: rgb(0.97, 0.97, 0.98),
          });

          const lblWidth = fontBold.widthOfTextAtSize(`(${label})`, 7.5);
          page2.drawText(`(${label})`, {
            x: lastExec.cx - lblWidth / 2,
            y: finalY - 2.5,
            size: 7.5,
            font: fontBold,
          });

          // Draw straight down arrow to continuation box
          page2.drawLine({
            start: { x: lastExec.cx, y: lastExec.bounds.bottom.y },
            end: { x: lastExec.cx, y: finalY + boxHeight / 2 + 5 },
            color: rgb(0, 0, 0),
            thickness: 1.2,
          });
          drawDownArrowHead(page2, lastExec.cx, finalY + boxHeight / 2, 4);
        }
      }

      console.log("✅ Page 2 (Flowchart Table) completed");
    }

    console.log("💾 Saving final PDF...");
    const output = await pdfDoc.save();
    console.log("✅ PDF Generated:", output.length, "bytes");

    return output;
  } catch (err) {
    console.error("❌ PDF generator error:", err);
    throw err;
  }
}