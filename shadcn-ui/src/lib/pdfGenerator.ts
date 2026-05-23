// src/lib/pdfGenerator.ts
import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";

interface FlowchartStep {
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
}

// Helper function to draw flowchart symbols
async function drawFlowchartSymbol(
  page: PDFPage,
  centerX: number,
  centerY: number,
  symbol: string,
  size: number,
  customImageBytes?: Uint8Array
) {
  const half = size / 2;

  switch (symbol) {
    case "oval": // Start/End
      page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: size * 0.8,
        yScale: size * 0.5,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
      break;

    case "rectangle": // Process
      page.drawRectangle({
        x: centerX - half,
        y: centerY - half * 0.7,
        width: size,
        height: size * 0.7,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
      break;

    case "diamond": // Decision
      // Draw diamond using lines
      const points = [
        { x: centerX, y: centerY + half }, // top
        { x: centerX + half, y: centerY }, // right
        { x: centerX, y: centerY - half }, // bottom
        { x: centerX - half, y: centerY }, // left
      ];
      
      for (let i = 0; i < points.length; i++) {
        const start = points[i];
        const end = points[(i + 1) % points.length];
        page.drawLine({
          start: { x: start.x, y: start.y },
          end: { x: end.x, y: end.y },
          color: rgb(0, 0, 0),
          thickness: 1.5,
        });
      }
      break;

    case "database": // Database
      // Draw cylinder shape
      page.drawEllipse({
        x: centerX,
        y: centerY + half * 0.7,
        xScale: half,
        yScale: half * 0.3,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
      
      page.drawLine({
        start: { x: centerX - half, y: centerY + half * 0.7 },
        end: { x: centerX - half, y: centerY - half * 0.7 },
        color: rgb(0, 0, 0),
        thickness: 1.5,
      });
      
      page.drawLine({
        start: { x: centerX + half, y: centerY + half * 0.7 },
        end: { x: centerX + half, y: centerY - half * 0.7 },
        color: rgb(0, 0, 0),
        thickness: 1.5,
      });
      
      page.drawEllipse({
        x: centerX,
        y: centerY - half * 0.7,
        xScale: half,
        yScale: half * 0.3,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
      break;

    case "document": // Document
      // Draw rectangle with wavy bottom
      page.drawRectangle({
        x: centerX - half,
        y: centerY - half * 0.5,
        width: size,
        height: size * 0.8,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
      
      // Draw wavy line at bottom (simplified as line)
      page.drawLine({
        start: { x: centerX - half, y: centerY - half * 0.5 },
        end: { x: centerX + half, y: centerY - half * 0.5 },
        color: rgb(0, 0, 0),
        thickness: 1.5,
      });
      break;

    default:
      // Default to filled square
      page.drawRectangle({
        x: centerX - 4,
        y: centerY - 4,
        width: 8,
        height: 8,
        color: rgb(0, 0, 0),
      });
  }

  // Embed custom image on top if provided
  if (customImageBytes && symbol === "custom") {
    try {
      const pdfDoc = page.doc;
      let img;
      // Try PNG first, then JPG
      try {
        img = await pdfDoc.embedPng(customImageBytes);
      } catch {
        img = await pdfDoc.embedJpg(customImageBytes);
      }
      const imgDims = img.scale(size / Math.max(img.width, img.height));
      page.drawImage(img, {
        x: centerX - imgDims.width / 2,
        y: centerY - imgDims.height / 2,
        width: imgDims.width,
        height: imgDims.height,
      });
    } catch (e) {
      // fallback rectangle if image fails
      page.drawRectangle({
        x: centerX - size / 2,
        y: centerY - size / 2,
        width: size,
        height: size,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
    }
  }
}

// Helper function to draw arrows
// Update helper function drawArrow untuk panah lebih tebal dan jelas

function drawArrow(
  page: PDFPage,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curved: boolean = false
) {
  const arrowSize = 5;
  const thickness = 1.5;
  const symbolWidth = 18;

  // Case 1: Pure horizontal (Same row, different columns)
  if (Math.abs(startY - endY) < 1) {
    const exitX = startX + (endX > startX ? symbolWidth / 2 : -symbolWidth / 2);
    const enterX = endX + (endX > startX ? -symbolWidth / 2 - arrowSize : symbolWidth / 2 + arrowSize);
    
    // Line from exit side to point before arrowhead
    page.drawLine({
      start: { x: exitX, y: startY },
      end: { x: enterX, y: startY },
      color: rgb(0, 0, 0),
      thickness,
    });

    // Horizontal arrowhead at enter side
    const path = endX > startX 
      ? `M ${endX - symbolWidth / 2} ${endY} L ${endX - symbolWidth / 2 - arrowSize} ${endY + arrowSize / 1.5} L ${endX - symbolWidth / 2 - arrowSize} ${endY - arrowSize / 1.5} Z`
      : `M ${endX + symbolWidth / 2} ${endY} L ${endX + symbolWidth / 2 + arrowSize} ${endY + arrowSize / 1.5} L ${endX + symbolWidth / 2 + arrowSize} ${endY - arrowSize / 1.5} Z`;
    
    page.drawSvgPath(path, {
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0,
    });
    return;
  }

  // Case 2: Cross-column curved (Normal flow)
  if (curved || Math.abs(endX - startX) > 5) {
    const sideX = startX + (endX > startX ? symbolWidth / 2 : -symbolWidth / 2);
    
    // 1. Horizontal segment
    page.drawLine({
      start: { x: sideX, y: startY },
      end: { x: endX, y: startY },
      color: rgb(0, 0, 0),
      thickness,
    });

    // 2. Vertical segment
    page.drawLine({
      start: { x: endX, y: startY },
      end: { x: endX, y: endY + arrowSize }, 
      color: rgb(0, 0, 0),
      thickness,
    });

    // 3. Arrowhead at endY with drawSvgPath
    const path = `M ${endX} ${endY} L ${endX - arrowSize / 1.5} ${endY + arrowSize} L ${endX + arrowSize / 1.5} ${endY + arrowSize} Z`;
    page.drawSvgPath(path, {
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0,
    });
    
  } else {
    // Case 3: Straight vertical arrow
    const topY = startY - symbolWidth / 2;
    const bottomY = endY + symbolWidth / 2 + arrowSize;
    
    page.drawLine({
      start: { x: startX, y: topY },
      end: { x: endX, y: bottomY },
      color: rgb(0, 0, 0),
      thickness,
    });
    
    const yTip = endY + symbolWidth / 2;
    const path = `M ${endX} ${yTip} L ${endX - arrowSize / 1.5} ${yTip + arrowSize} L ${endX + arrowSize / 1.5} ${yTip + arrowSize} Z`;
    page.drawSvgPath(path, {
      color: rgb(0, 0, 0),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0,
    });
  }
}

// Helper to determine flowchart symbol for a specific pelaksana in a step
function determineSymbol(step: FlowchartStep, pelaksanaName: string, stepIdx: number, totalSteps: number): string {
  if (step.shapes && step.shapes[pelaksanaName] && step.shapes[pelaksanaName] !== "auto") {
    return step.shapes[pelaksanaName];
  }

  // Backwards compatibility or if not specified
  const aktivitas = step.aktivitas.toLowerCase();
  
  // First step = start (oval)
  if (stepIdx === 0) return "oval";
  
  // Last step = end (oval)
  if (stepIdx === totalSteps - 1) return "oval";
  
  // Decision keywords
  if (aktivitas.includes("validasi") || 
      aktivitas.includes("cek") || 
      aktivitas.includes("verifikasi") ||
      aktivitas.includes("review")) {
    return "diamond";
  }
  
  // Database keywords
  if (aktivitas.includes("backup") || 
      aktivitas.includes("simpan") ||
      aktivitas.includes("database") ||
      aktivitas.includes("input")) {
    return "database";
  }
  
  // Document keywords
  if (aktivitas.includes("cetak") || 
      aktivitas.includes("print") ||
      aktivitas.includes("laporan")) {
    return "document";
  }
  
  // Default = process (rectangle)
  return "rectangle";
}

// Helper function for word wrapping
function wrapText(
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number
): string[] {
  if (!text || text.trim() === "") return [""];

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

  return lines.length > 0 ? lines : [""];
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
  customShapeImages?: { [stepIndex: number]: Uint8Array }; // custom images per step index
  finalAction?: string; // "none", "organisasi", "workflow", "lainnya"
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

      const margin = 30;
      const tableWidth = width - 2 * margin;
      const tableTop = height - 60;

      const colNo = 25;
      const colAktivitas = 175;
      const pelaksanaWidth = 250;
      const colWidthPerPelaksana = pelaksanaWidth / pelaksanaColumns.length;
      const colMutuBakuTotal = 180;
      const colMutuBakuPer = colMutuBakuTotal / 3;
      const colKeterangan =
        tableWidth - colNo - colAktivitas - pelaksanaWidth - colMutuBakuTotal;

      const rowHeight = 40;
      const headerHeight = 60;

      // Draw table border
      page2.drawRectangle({
        x: margin,
        y: tableTop - headerHeight - rowHeight * flowchartSteps.length,
        width: tableWidth,
        height: headerHeight + rowHeight * flowchartSteps.length,
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
      });
      write(page2, "No", currentX + 5, currentY - 25, 10, true);
      currentX += colNo;

      // Header: Aktivitas
      page2.drawRectangle({
        x: currentX,
        y: currentY - headerHeight,
        width: colAktivitas,
        height: headerHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      write(page2, "Aktivitas", currentX + 5, currentY - 25, 10, true);
      currentX += colAktivitas;

      // Header: Pelaksana (main)
      const pelaksanaStartX = currentX;
      page2.drawRectangle({
        x: currentX,
        y: currentY - 30,
        width: pelaksanaWidth,
        height: 30,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      write(page2, "Pelaksana", currentX + pelaksanaWidth / 2 - 20, currentY - 20, 10, true);

      // Sub-headers pelaksana
      pelaksanaColumns.forEach((col, idx) => {
        const subX = pelaksanaStartX + idx * colWidthPerPelaksana;
        page2.drawRectangle({
          x: subX,
          y: currentY - headerHeight,
          width: colWidthPerPelaksana,
          height: 30,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        const words = col.split(" ");
        let line = "";
        let lineY = currentY - 45;

        for (const word of words) {
          const testLine = line + (line ? " " : "") + word;
          const textWidth = fontRegular.widthOfTextAtSize(testLine, 8);

          if (textWidth > colWidthPerPelaksana - 4 && line) {
            write(page2, line, subX + 2, lineY, 8, false);
            line = word;
            lineY -= 10;
          } else {
            line = testLine;
          }
        }
        if (line) {
          write(page2, line, subX + 2, lineY, 8, false);
        }
      });

      currentX += pelaksanaWidth;

      // Header: Mutu Baku (main)
      const mutuBakuStartX = currentX;
      page2.drawRectangle({
        x: currentX,
        y: currentY - 30,
        width: colMutuBakuTotal,
        height: 30,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      write(page2, "Mutu Baku", currentX + colMutuBakuTotal / 2 - 20, currentY - 20, 10, true);

      // Sub-headers Mutu Baku
      const mutuBakuHeaders = ["Persyaratan/\nKelengkapan", "Output", "Waktu"];

      mutuBakuHeaders.forEach((header, idx) => {
        const subX = mutuBakuStartX + idx * colMutuBakuPer;
        page2.drawRectangle({
          x: subX,
          y: currentY - headerHeight,
          width: colMutuBakuPer,
          height: 30,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        const lines = header.split("\n");
        lines.forEach((line, lineIdx) => {
          write(page2, line, subX + 3, currentY - 42 - lineIdx * 10, 8, false);
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
      });
      write(page2, "Keterangan", currentX + 5, currentY - 25, 10, true);

      // ===== DATA ROWS WITH FLOWCHART =====
      currentY = tableTop - headerHeight;

      // Store positions for drawing arrows later
      const stepPositions: Array<{
        x: number;
        y: number;
        colIdx: number;
      }> = [];

      for (let stepIdx = 0; stepIdx < flowchartSteps.length; stepIdx++) {
        const step = flowchartSteps[stepIdx];
        currentX = margin;

        // No
        page2.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: colNo,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        write(page2, String(step.no), currentX + 10, currentY - 25, 10, false);
        currentX += colNo;

        // Aktivitas
        page2.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: colAktivitas,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        const aktivitasLines = wrapText(step.aktivitas, colAktivitas - 10, fontRegular, 8);
        aktivitasLines.slice(0, 3).forEach((line, lineIdx) => {
          write(page2, line, currentX + 5, currentY - 15 - lineIdx * 10, 8, false);
        });
        currentX += colAktivitas;

        // Pelaksana columns WITH FLOWCHART SYMBOLS
        const pelaksanaBaseX = currentX;
        
        for (let idx = 0; idx < pelaksanaColumns.length; idx++) {
          const col = pelaksanaColumns[idx];
          const subX = currentX + idx * colWidthPerPelaksana;
          page2.drawRectangle({
            x: subX,
            y: currentY - rowHeight,
            width: colWidthPerPelaksana,
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });

          if (step.pelaksana[col]) {
            const centerX = subX + colWidthPerPelaksana / 2;
            const centerY = currentY - rowHeight / 2;

            // Store position for arrow drawing
            stepPositions.push({ x: centerX, y: centerY, colIdx: idx });

            // Determine and draw symbol
            const symbol = determineSymbol(step, col, stepIdx, flowchartSteps.length);
            await drawFlowchartSymbol(page2, centerX, centerY, symbol, 18, customShapeImages[stepIdx]);
          }
        }

        currentX += pelaksanaWidth;

        // Mutu Baku
        const mutuBakuValues = [
          step.mutuBaku.persyaratan,
          step.mutuBaku.output,
          step.mutuBaku.waktu,
        ];

        mutuBakuValues.forEach((value, idx) => {
          const subX = currentX + idx * colMutuBakuPer;
          page2.drawRectangle({
            x: subX,
            y: currentY - rowHeight,
            width: colMutuBakuPer,
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });

          const lines = wrapText(value, colMutuBakuPer - 6, fontRegular, 8);
          lines.slice(0, 3).forEach((line, lineIdx) => {
            write(page2, line, subX + 3, currentY - 15 - lineIdx * 10, 8, false);
          });
        });
        currentX += colMutuBakuTotal;

        // Keterangan
        page2.drawRectangle({
          x: currentX,
          y: currentY - rowHeight,
          width: colKeterangan,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });
        const keteranganLines = wrapText(step.keterangan, colKeterangan - 10, fontRegular, 8);
        keteranganLines.slice(0, 3).forEach((line, lineIdx) => {
          write(page2, line, currentX + 5, currentY - 15 - lineIdx * 10, 8, false);
        });

        currentY -= rowHeight;
      }


      // Draw arrows between steps (after all rows drawn)
      // In PDF-lib, Y is bottom-up. Rows are drawn from high Y (top) to low Y (bottom).
      // Symbol at row i: centerY_i = tableTop - headerHeight - i*rowHeight - rowHeight/2
      // Symbol at row i+1: centerY_{i+1} = centerY_i - rowHeight  (LOWER Y = visually below)
      // Arrow exits from BOTTOM of symbol (smaller Y): centerY - symbolHalf
      // Arrow enters TOP of next symbol (larger Y of next row): centerY_next + symbolHalf
      const symbolHalf = 10; // distance from center to arrow tip; tip-to-grid gap = 10px (for 40px row)

      for (let i = 0; i < flowchartSteps.length - 1; i++) {
        const currentStep = flowchartSteps[i];
        const nextStep = flowchartSteps[i + 1];
        
        // Get all active columns for current step with their specific shapes
        const currentActiveColumns: Array<{ colIdx: number; x: number; y: number; shape: string }> = [];
        pelaksanaColumns.forEach((col, colIdx) => {
          if (currentStep.pelaksana[col]) {
            const subX = margin + colNo + colAktivitas + colIdx * colWidthPerPelaksana;
            const centerX = subX + colWidthPerPelaksana / 2;
            const centerY = tableTop - headerHeight - i * rowHeight - rowHeight / 2;
            const shape = determineSymbol(currentStep, col, i, flowchartSteps.length);
            currentActiveColumns.push({ colIdx, x: centerX, y: centerY, shape });
          }
        });
        
        // Get all active columns for next step with their specific shapes
        const nextActiveColumns: Array<{ colIdx: number; x: number; y: number; shape: string }> = [];
        pelaksanaColumns.forEach((col, colIdx) => {
          if (nextStep.pelaksana[col]) {
            const subX = margin + colNo + colAktivitas + colIdx * colWidthPerPelaksana;
            const centerX = subX + colWidthPerPelaksana / 2;
            const centerY = tableTop - headerHeight - (i + 1) * rowHeight - rowHeight / 2;
            const shape = determineSymbol(nextStep, col, i + 1, flowchartSteps.length);
            nextActiveColumns.push({ colIdx, x: centerX, y: centerY, shape });
          }
        });

        // Draw symbols for current step
        for (const col of currentActiveColumns) {
          await drawFlowchartSymbol(
            page2,
            col.x,
            col.y,
            col.shape,
            18,
            customShapeImages[i]
          );
        }
        
        // 1. Draw horizontal arrows within the same step if multiple executors
        if (currentActiveColumns.length > 1) {
          for (let j = 0; j < currentActiveColumns.length - 1; j++) {
            const currentExec = currentActiveColumns[j];
            const nextExec = currentActiveColumns[j + 1];
            // Pure horizontal connection
            drawArrow(page2, currentExec.x, currentExec.y, nextExec.x, nextExec.y, false);
          }
        }

        // 2. Connect only the LAST executor of current row to the FIRST executor of next row
        const lastExec = currentActiveColumns[currentActiveColumns.length - 1];
        const firstNextExec = nextActiveColumns[0];
        
        if (lastExec && firstNextExec) {
          const isCurved = Math.abs(lastExec.colIdx - firstNextExec.colIdx) > 0;
          drawArrow(page2, lastExec.x, lastExec.y, firstNextExec.x, firstNextExec.y, isCurved);
        }
      }

      // Draw Final Action Symbol at the bottom
      const finalAction = params.finalAction || "none";
      if (finalAction !== "none" && flowchartSteps.length > 0) {
        const lastStep = flowchartSteps[flowchartSteps.length - 1];
        const lastStepPelaksanas: Array<{ colIdx: number; x: number; y: number }> = [];
        pelaksanaColumns.forEach((col, colIdx) => {
          if (lastStep.pelaksana[col]) {
            const subX = margin + colNo + colAktivitas + colIdx * colWidthPerPelaksana;
            const centerX = subX + colWidthPerPelaksana / 2;
            const centerY = tableTop - headerHeight - (flowchartSteps.length - 1) * rowHeight - rowHeight / 2;
            lastStepPelaksanas.push({ colIdx, x: centerX, y: centerY });
          }
        });

        if (lastStepPelaksanas.length > 0) {
          const lastExec = lastStepPelaksanas[lastStepPelaksanas.length - 1];
          const finalY = lastExec.y - rowHeight; // Draw slightly below the last row
          const label = finalAction === "organisasi" ? "Diagram Organisasi" : 
                        finalAction === "workflow" ? "Diagram Alur Kerja" : "Diagram Lanjutan";
          
          // Draw a small label box indicating continuation
          const boxWidth = 100;
          const boxHeight = 20;
          
          page2.drawRectangle({
            x: lastExec.x - boxWidth / 2,
            y: finalY - boxHeight / 2,
            width: boxWidth,
            height: boxHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });

          page2.drawText(`(${label})`, {
            x: lastExec.x - boxWidth / 2 + 5,
            y: finalY - 4,
            size: 8,
            font: fontBold,
          });

          // Draw arrow from last symbol to this final action label
          drawArrow(page2, lastExec.x, lastExec.y, lastExec.x, finalY + boxHeight / 2, false);
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