// src/lib/pdfGenerator.ts
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface FlowchartConnection {
  targetStep: number; // 0 = Selesai, 1..N = Nomor langkah (bisa langkah saat ini, sebelumnya, atau sesudahnya!)
  targetPelaksana?: string; // Nama pelaksana tujuan
}

export interface ExecutorRoute {
  targetStep?: number; // Target langkah utama (1..N, atau 0 = Selesai)
  targetPelaksana?: string; // Pelaksana di langkah tujuan
  returnStep?: number; // Target langkah cabang balik / revisi (1..N)
  returnPelaksana?: string; // Pelaksana alur balik
  returnLabel?: string; // (legacy)
}

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
  shapeText?: { [pelaksana: string]: string } | string; // Text label inside shape (legacy)
  connections?: { [pelaksana: string]: FlowchartConnection[] }; // Banyak koneksi fleksibel per pelaksana!
  executorRoutes?: { [pelaksana: string]: ExecutorRoute }; // Fallback rute fleksibel per pelaksana
  targetStep?: number; // Fallback target langkah selanjutnya (default: no + 1, atau 0 = selesai)
  returnStep?: number; // Fallback target langkah alternatif / kembali
  returnLabel?: string; // (legacy)
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

// Calculate standard plain symbol dimensions (polosan tanpa teks)
function getDynamicSymbolDims(
  symbol: string,
  _label: string,
  _maxAvailW: number,
  _fontBold: PDFFont
): DynamicSymbolDims {
  let shapeW = 34;
  let shapeH = 18;

  const sym = (symbol || "").toLowerCase();
  if (sym === "terminator" || sym === "oval") {
    shapeW = 36;
    shapeH = 18;
  } else if (sym === "decision" || sym === "diamond") {
    shapeW = 30;
    shapeH = 22;
  } else if (sym === "connector" || sym === "circle" || sym === "or" || sym === "summing") {
    shapeW = 18;
    shapeH = 18;
  } else if (sym === "merge" || sym === "extract" || sym === "collate" || sym === "offpage") {
    shapeW = 30;
    shapeH = 19;
  } else {
    shapeW = 34;
    shapeH = 18;
  }

  return {
    width: shapeW,
    height: shapeH,
    halfW: shapeW / 2,
    halfH: shapeH / 2,
    lines: [],
    fontSize: 6,
  };
}

// Draw crisp vector symbols (25 standard flowchart symbols)
async function drawFlowchartSymbol(
  page: PDFPage,
  centerX: number,
  centerY: number,
  symbol: string,
  dims: DynamicSymbolDims,
  fontBold: PDFFont,
  customImageBytes?: Uint8Array
) {
  const { halfW, halfH } = dims;
  const white = rgb(1, 1, 1);
  const black = rgb(0, 0, 0);
  const sym = (symbol || "process").toLowerCase();

  switch (sym) {
    case "terminator":
    case "oval":
      page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: halfW,
        yScale: halfH,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      break;

    case "decision":
    case "diamond":
      page.drawSvgPath(`M 0 ${halfH} L ${halfW} 0 L 0 ${-halfH} L ${-halfW} 0 Z`, {
        x: centerX,
        y: centerY,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      break;

    case "data":
    case "parallelogram":
      page.drawSvgPath(
        `M ${-halfW + 4} ${halfH} L ${halfW} ${halfH} L ${halfW - 4} ${-halfH} L ${-halfW} ${-halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "predefined":
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      page.drawLine({
        start: { x: centerX - halfW + 4, y: centerY - halfH },
        end: { x: centerX - halfW + 4, y: centerY + halfH },
        color: black,
        thickness: 1,
      });
      page.drawLine({
        start: { x: centerX + halfW - 4, y: centerY - halfH },
        end: { x: centerX + halfW - 4, y: centerY + halfH },
        color: black,
        thickness: 1,
      });
      break;

    case "preparation":
      page.drawSvgPath(
        `M ${-halfW + 5} ${halfH} L ${halfW - 5} ${halfH} L ${halfW} 0 L ${halfW - 5} ${-halfH} L ${-halfW + 5} ${-halfH} L ${-halfW} 0 Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "document":
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      // Wave curve indicator at bottom
      page.drawLine({
        start: { x: centerX - halfW, y: centerY - halfH + 3 },
        end: { x: centerX + halfW, y: centerY - halfH + 3 },
        color: black,
        thickness: 0.8,
      });
      break;

    case "multidocument":
      // Layer 1 (belakang)
      page.drawRectangle({
        x: centerX - halfW + 3,
        y: centerY - halfH + 3,
        width: halfW * 2 - 3,
        height: halfH * 2 - 3,
        color: rgb(0.9, 0.9, 0.9),
        borderColor: black,
        borderWidth: 0.9,
      });
      // Layer 2 (depan)
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2 - 3,
        height: halfH * 2 - 3,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      break;

    case "card":
      page.drawSvgPath(
        `M ${-halfW + 5} ${halfH} L ${halfW} ${halfH} L ${halfW} ${-halfH} L ${-halfW} ${-halfH} L ${-halfW} ${halfH - 5} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "display":
      page.drawSvgPath(
        `M ${-halfW} 0 L ${-halfW + 5} ${halfH} L ${halfW - 4} ${halfH} L ${halfW} 0 L ${halfW - 4} ${-halfH} L ${-halfW + 5} ${-halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "manual_input":
      page.drawSvgPath(
        `M ${-halfW} ${halfH - 4} L ${halfW} ${halfH} L ${halfW} ${-halfH} L ${-halfW} ${-halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "manual_operation":
      page.drawSvgPath(
        `M ${-halfW} ${halfH} L ${halfW} ${halfH} L ${halfW - 4} ${-halfH} L ${-halfW + 4} ${-halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "delay":
      page.drawSvgPath(
        `M ${-halfW} ${halfH} L ${halfW - 6} ${halfH} A 6 6 0 0 1 ${halfW - 6} ${-halfH} L ${-halfW} ${-halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "collate":
      page.drawSvgPath(
        `M ${-halfW} ${halfH} L ${halfW} ${halfH} L ${-halfW} ${-halfH} L ${halfW} ${-halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "sort":
      page.drawSvgPath(`M 0 ${halfH} L ${halfW} 0 L 0 ${-halfH} L ${-halfW} 0 Z`, {
        x: centerX,
        y: centerY,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      page.drawLine({
        start: { x: centerX - halfW, y: centerY },
        end: { x: centerX + halfW, y: centerY },
        color: black,
        thickness: 1,
      });
      break;

    case "connector":
    case "circle":
      page.drawEllipse({
        x: centerX,
        y: centerY,
        xScale: Math.min(halfW, halfH),
        yScale: Math.min(halfW, halfH),
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      break;

    case "offpage":
      page.drawSvgPath(
        `M ${-halfW + 2} ${halfH} L ${halfW - 2} ${halfH} L ${halfW - 2} 0 L 0 ${-halfH} L ${-halfW + 2} 0 Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "merge":
      page.drawSvgPath(`M ${-halfW} ${halfH} L ${halfW} ${halfH} L 0 ${-halfH} Z`, {
        x: centerX,
        y: centerY,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      break;

    case "extract":
      page.drawSvgPath(`M 0 ${halfH} L ${halfW} ${-halfH} L ${-halfW} ${-halfH} Z`, {
        x: centerX,
        y: centerY,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      break;

    case "or":
      {
        const r = Math.min(halfW, halfH);
        page.drawEllipse({
          x: centerX,
          y: centerY,
          xScale: r,
          yScale: r,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        });
        page.drawLine({
          start: { x: centerX, y: centerY - r },
          end: { x: centerX, y: centerY + r },
          color: black,
          thickness: 1,
        });
        page.drawLine({
          start: { x: centerX - r, y: centerY },
          end: { x: centerX + r, y: centerY },
          color: black,
          thickness: 1,
        });
      }
      break;

    case "summing":
      {
        const r = Math.min(halfW, halfH);
        page.drawEllipse({
          x: centerX,
          y: centerY,
          xScale: r,
          yScale: r,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        });
        const off = r * 0.707;
        page.drawLine({
          start: { x: centerX - off, y: centerY - off },
          end: { x: centerX + off, y: centerY + off },
          color: black,
          thickness: 1,
        });
        page.drawLine({
          start: { x: centerX - off, y: centerY + off },
          end: { x: centerX + off, y: centerY - off },
          color: black,
          thickness: 1,
        });
      }
      break;

    case "database":
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      page.drawEllipse({
        x: centerX,
        y: centerY + halfH - 2,
        xScale: halfW,
        yScale: 2.5,
        borderColor: black,
        borderWidth: 1,
      });
      break;

    case "internal_storage":
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      page.drawLine({
        start: { x: centerX - halfW, y: centerY + halfH - 4 },
        end: { x: centerX + halfW, y: centerY + halfH - 4 },
        color: black,
        thickness: 1,
      });
      page.drawLine({
        start: { x: centerX - halfW + 4, y: centerY - halfH },
        end: { x: centerX - halfW + 4, y: centerY + halfH },
        color: black,
        thickness: 1,
      });
      break;

    case "stored_data":
      page.drawSvgPath(
        `M ${-halfW + 4} ${halfH} L ${halfW - 4} ${halfH} A 4 4 0 0 1 ${halfW - 4} ${-halfH} L ${-halfW + 4} ${-halfH} A 4 4 0 0 1 ${-halfW + 4} ${halfH} Z`,
        {
          x: centerX,
          y: centerY,
          color: white,
          borderColor: black,
          borderWidth: 1.2,
        }
      );
      break;

    case "sequential_data":
      page.drawEllipse({
        x: centerX - 2,
        y: centerY,
        xScale: halfH - 1,
        yScale: halfH - 1,
        color: white,
        borderColor: black,
        borderWidth: 1.2,
      });
      page.drawLine({
        start: { x: centerX - 2, y: centerY - (halfH - 1) },
        end: { x: centerX + halfW, y: centerY - (halfH - 1) },
        color: black,
        thickness: 1.2,
      });
      break;

    case "process":
    case "rectangle":
    default:
      page.drawRectangle({
        x: centerX - halfW,
        y: centerY - halfH,
        width: halfW * 2,
        height: halfH * 2,
        color: white,
        borderColor: black,
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
}

// Arrowhead Drawing Helpers (High-precision Relative Coordinates with Proper SVG/PDF Axis Mapping)
function drawDownArrowHead(page: PDFPage, x: number, y: number, size = 6) {
  const w = size * 0.75;
  const h = size * 1.35;
  page.drawSvgPath(`M 0 0 L ${-w} ${-h} L ${w} ${-h} Z`, {
    x,
    y,
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

function drawUpArrowHead(page: PDFPage, x: number, y: number, size = 6) {
  const w = size * 0.75;
  const h = size * 1.35;
  page.drawSvgPath(`M 0 0 L ${-w} ${h} L ${w} ${h} Z`, {
    x,
    y,
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

function drawRightArrowHead(page: PDFPage, x: number, y: number, size = 6) {
  const w = size * 0.75;
  const h = size * 1.35;
  page.drawSvgPath(`M 0 0 L ${-h} ${-w} L ${-h} ${w} Z`, {
    x,
    y,
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

function drawLeftArrowHead(page: PDFPage, x: number, y: number, size = 6) {
  const w = size * 0.75;
  const h = size * 1.35;
  page.drawSvgPath(`M 0 0 L ${h} ${-w} L ${h} ${w} Z`, {
    x,
    y,
    color: rgb(0, 0, 0),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0,
  });
}

// Orthogonal Swimlane Connector between Step A and Step B
function drawOrthogonalConnection(
  page: PDFPage,
  fromBounds: SymbolBounds,
  toBounds: SymbolBounds,
  rowBottomYFrom?: number,
  rowTopYTo?: number
) {
  const startX = fromBounds.bottom.x;
  const startY = fromBounds.bottom.y;
  const endX = toBounds.top.x;
  const endY = toBounds.top.y;
  const arrowSize = 5.5;
  const thickness = 1.3;
  const arrowH = arrowSize * 1.35; // ~7.4 pt

  if (Math.abs(startX - endX) < 4) {
    // 1. Straight vertical line down
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: endX, y: endY + arrowH * 0.5 },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawDownArrowHead(page, endX, endY, arrowSize);
  } else {
    // 2. Elbow orthogonal connection across columns in whitespace
    // Letakkan elbowY di ruang putih sel atas (6 pt di atas border tabel)
    let elbowY = rowBottomYFrom !== undefined ? rowBottomYFrom + 6 : startY - 7;

    // Pastikan siku cukup tinggi di atas endY agar kepala panah leluasa
    if (elbowY < endY + arrowH + 4) {
      elbowY = endY + arrowH + 4;
    }
    // Pastikan siku cukup rendah di bawah startY
    if (elbowY > startY - 4) {
      elbowY = startY - 4;
    }

    // 1. Drop down from fromShape to elbowY
    page.drawLine({
      start: { x: startX, y: startY },
      end: { x: startX, y: elbowY },
      color: rgb(0, 0, 0),
      thickness,
    });

    // 2. Horizontal segment across columns
    page.drawLine({
      start: { x: startX, y: elbowY },
      end: { x: endX, y: elbowY },
      color: rgb(0, 0, 0),
      thickness,
    });

    // 3. Drop down from elbowY directly into top of toShape
    page.drawLine({
      start: { x: endX, y: elbowY },
      end: { x: endX, y: endY + arrowH * 0.5 },
      color: rgb(0, 0, 0),
      thickness,
    });

    // 4. Arrowhead
    drawDownArrowHead(page, endX, endY, arrowSize);
  }
}

// Horizontal Connector within the same step (Antar Pelaksana di baris yang sama)
function drawHorizontalStepConnection(
  page: PDFPage,
  fromBounds: SymbolBounds,
  toBounds: SymbolBounds,
  isBidirectional = false
) {
  const isRight = toBounds.left.x > fromBounds.right.x;
  const arrowSize = 5.5;
  const thickness = 1.3;
  const arrowH = arrowSize * 1.35; // ~7.4 pt

  // Jika bolak-balik: garis ke kanan di cy + 4.5, garis ke kiri di cy - 4.5
  const verticalOffset = isBidirectional ? (isRight ? 4.5 : -4.5) : 0;
  const y = fromBounds.left.y + verticalOffset;

  if (isRight) {
    page.drawLine({
      start: { x: fromBounds.right.x, y },
      end: { x: toBounds.left.x - arrowH * 0.5, y },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawRightArrowHead(page, toBounds.left.x, y, arrowSize);
  } else {
    page.drawLine({
      start: { x: fromBounds.left.x, y },
      end: { x: toBounds.right.x + arrowH * 0.5, y },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawLeftArrowHead(page, toBounds.right.x, y, arrowSize);
  }
}

// Loop back connector (e.g. from Step 3 back to Step 1 - alur bolak-balik polosan bebas tabrakan)
function drawLoopBackConnection(
  page: PDFPage,
  fromShape: { cx: number; cy: number; bounds: SymbolBounds; colIdx: number },
  toShape: { cx: number; cy: number; bounds: SymbolBounds; colIdx: number },
  pelaksanaStartX: number,
  allShapesAtFromStep: { cx: number; bounds: SymbolBounds }[],
  allShapesAtToStep: { cx: number; bounds: SymbolBounds }[],
  offsetIndex = 0,
  rowBottomYFrom?: number,
  rowTopYTo?: number
) {
  const arrowSize = 5.5;
  const thickness = 1.3;
  const arrowH = arrowSize * 1.35; // ~7.4 pt
  // Koridor trackX di sebelah kiri kolom pelaksana, bergeser bersih dari garis pembatas tabel
  const trackX = pelaksanaStartX + 14 + (offsetIndex * 8);

  // Periksa apakah di baris asal ada tetangga di sebelah kiri fromShape
  const hasLeftNeighborFrom = allShapesAtFromStep.some((s) => s.cx < fromShape.cx - 10);
  // Periksa apakah di baris target ada tetangga di sebelah kiri toShape
  const hasLeftNeighborTo = allShapesAtToStep.some((s) => s.cx < toShape.cx - 10);

  // Offset vertikal agar multiple loop-back tidak bertumpukan di garis atau kepala panah yang sama
  const verticalStagger = offsetIndex === 0 ? 0 : (offsetIndex % 2 === 1 ? 3.5 : -3.5);

  // 1. Jalur keluar dari fromShape menuju trackX
  let startY_vert: number;
  if (hasLeftNeighborFrom) {
    // Turun dulu ke celah bawah sel di ruang putih (7 pt di atas border tabel)
    const exitY = rowBottomYFrom !== undefined ? rowBottomYFrom + 7 : fromShape.bounds.bottom.y - 7;
    page.drawLine({
      start: { x: fromShape.cx, y: fromShape.bounds.bottom.y },
      end: { x: fromShape.cx, y: exitY },
      color: rgb(0, 0, 0),
      thickness,
    });
    page.drawLine({
      start: { x: fromShape.cx, y: exitY },
      end: { x: trackX, y: exitY },
      color: rgb(0, 0, 0),
      thickness,
    });
    startY_vert = exitY;
  } else {
    // Langsung keluar dari tepi kiri fromShape ke trackX
    const exitY = fromShape.cy + verticalStagger;
    page.drawLine({
      start: { x: fromShape.bounds.left.x, y: exitY },
      end: { x: trackX, y: exitY },
      color: rgb(0, 0, 0),
      thickness,
    });
    startY_vert = exitY;
  }

  // 2. Jalur masuk ke toShape dari trackX
  let endY_vert: number;
  if (hasLeftNeighborTo) {
    // Naik sampai celah atas sel target (7 pt di bawah border tabel), lalu turun ke puncak toShape
    const entryY = rowTopYTo !== undefined ? rowTopYTo - 7 : toShape.bounds.top.y + 8;
    endY_vert = entryY;
    page.drawLine({
      start: { x: trackX, y: entryY },
      end: { x: toShape.cx, y: entryY },
      color: rgb(0, 0, 0),
      thickness,
    });
    page.drawLine({
      start: { x: toShape.cx, y: entryY },
      end: { x: toShape.cx, y: toShape.bounds.top.y + arrowH * 0.5 },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawDownArrowHead(page, toShape.cx, toShape.bounds.top.y, arrowSize);
  } else {
    // Langsung masuk dari trackX ke tepi kiri toShape (diberi verticalStagger agar tidak bertumpukan)
    const entryY = toShape.cy + verticalStagger;
    endY_vert = entryY;
    page.drawLine({
      start: { x: trackX, y: entryY },
      end: { x: toShape.bounds.left.x - arrowH * 0.5, y: entryY },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawRightArrowHead(page, toShape.bounds.left.x, entryY, arrowSize);
  }

  // 3. Garis vertikal naik di sepanjang trackX
  page.drawLine({
    start: { x: trackX, y: startY_vert },
    end: { x: trackX, y: endY_vert },
    color: rgb(0, 0, 0),
    thickness,
  });
}

// Forward jump connector (e.g. from Step 1 skip to Step 4 - polosan bebas tabrakan)
function drawJumpForwardConnection(
  page: PDFPage,
  fromShape: { cx: number; cy: number; bounds: SymbolBounds; colIdx: number },
  toShape: { cx: number; cy: number; bounds: SymbolBounds; colIdx: number },
  pelaksanaStartX: number,
  pelaksanaWidth: number,
  allShapesAtFromStep: { cx: number; bounds: SymbolBounds }[],
  allShapesAtToStep: { cx: number; bounds: SymbolBounds }[],
  offsetIndex = 0,
  rowBottomYFrom?: number,
  rowTopYTo?: number
) {
  const arrowSize = 5.5;
  const thickness = 1.3;
  const arrowH = arrowSize * 1.35; // ~7.4 pt
  const trackX = pelaksanaStartX + pelaksanaWidth - 14 - (offsetIndex * 8);

  // Periksa apakah di baris asal ada tetangga di sebelah kanan fromShape
  const hasRightNeighborFrom = allShapesAtFromStep.some((s) => s.cx > fromShape.cx + 10);
  // Periksa apakah di baris target ada tetangga di sebelah kanan toShape
  const hasRightNeighborTo = allShapesAtToStep.some((s) => s.cx > toShape.cx + 10);

  // Offset vertikal agar multiple jumps tidak bertumpukan di garis atau kepala panah yang sama
  const verticalStagger = offsetIndex === 0 ? 0 : (offsetIndex % 2 === 1 ? 3.5 : -3.5);

  // 1. Jalur keluar dari fromShape menuju trackX
  let startY_vert: number;
  if (hasRightNeighborFrom) {
    // Turun dulu ke celah bawah sel di ruang putih (7 pt di atas border tabel)
    const exitY = rowBottomYFrom !== undefined ? rowBottomYFrom + 7 : fromShape.bounds.bottom.y - 7;
    page.drawLine({
      start: { x: fromShape.cx, y: fromShape.bounds.bottom.y },
      end: { x: fromShape.cx, y: exitY },
      color: rgb(0, 0, 0),
      thickness,
    });
    page.drawLine({
      start: { x: fromShape.cx, y: exitY },
      end: { x: trackX, y: exitY },
      color: rgb(0, 0, 0),
      thickness,
    });
    startY_vert = exitY;
  } else {
    // Langsung keluar dari tepi kanan fromShape ke trackX
    const exitY = fromShape.cy + verticalStagger;
    page.drawLine({
      start: { x: fromShape.bounds.right.x, y: exitY },
      end: { x: trackX, y: exitY },
      color: rgb(0, 0, 0),
      thickness,
    });
    startY_vert = exitY;
  }

  // 2. Jalur masuk ke toShape dari trackX
  let endY_vert: number;
  if (hasRightNeighborTo) {
    // Naik sampai celah atas sel target (7 pt di bawah border tabel), lalu turun ke puncak toShape
    const entryY = rowTopYTo !== undefined ? rowTopYTo - 7 : toShape.bounds.top.y + 8;
    endY_vert = entryY;
    page.drawLine({
      start: { x: trackX, y: entryY },
      end: { x: toShape.cx, y: entryY },
      color: rgb(0, 0, 0),
      thickness,
    });
    page.drawLine({
      start: { x: toShape.cx, y: entryY },
      end: { x: toShape.cx, y: toShape.bounds.top.y + arrowH * 0.5 },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawDownArrowHead(page, toShape.cx, toShape.bounds.top.y, arrowSize);
  } else {
    // Langsung masuk dari trackX ke tepi kanan toShape (diberi verticalStagger)
    const entryY = toShape.cy + verticalStagger;
    endY_vert = entryY;
    page.drawLine({
      start: { x: trackX, y: entryY },
      end: { x: toShape.bounds.right.x + arrowH * 0.5, y: entryY },
      color: rgb(0, 0, 0),
      thickness,
    });
    drawLeftArrowHead(page, toShape.bounds.right.x, entryY, arrowSize);
  }

  // 3. Garis vertikal turun di sepanjang trackX
  page.drawLine({
    start: { x: trackX, y: startY_vert },
    end: { x: trackX, y: endY_vert },
    color: rgb(0, 0, 0),
    thickness,
  });
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

// Plain symbol: no internal text label
function determineSymbolLabel(_step: FlowchartStep, _pelaksanaName: string, _symbol: string, _stepIdx: number, _totalSteps: number): string {
  return "";
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

export interface KOPConfig {
  instansi?: string;        // Default: "Badan Pusat Statistik Kota Surabaya"
  kepalaInstansi?: string;  // Default: "Kepala Badan Pusat Statistik Kota Surabaya"
  subBagian?: string;       // Default: "Kepala Sub. Bagian Tata Usaha"
  jabatanPengesah?: string; // Default: "Kepala BPS Kota Surabaya"
  namaPengesah?: string;    // Default: "Dr. Arrief Chandra Setiawan, SST., M.Si."
  nipPengesah?: string;     // Default: "NIP. 196508161992031001"
  stempelImage?: Uint8Array | string; // Base64 data URL atau Uint8Array
  ttdImage?: Uint8Array | string;     // Base64 data URL atau Uint8Array
}

async function resolveImageBytes(
  input?: Uint8Array | string
): Promise<{ bytes: Uint8Array; type: "png" | "jpg" } | null> {
  if (!input) return null;
  if (input instanceof Uint8Array) {
    if (input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47) {
      return { bytes: input, type: "png" };
    }
    return { bytes: input, type: "jpg" };
  }
  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      const isPng = input.includes("image/png");
      const commaIdx = input.indexOf(",");
      const b64 = input.slice(commaIdx + 1);
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { bytes, type: isPng ? "png" : "jpg" };
    }
    try {
      if (typeof window !== "undefined" && typeof window.fetch === "function") {
        const resp = await fetch(input);
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        return { bytes, type: isPng ? "png" : "jpg" };
      } else {
        const req = (name: string) => (globalThis as any)["require"] ? (globalThis as any)["require"](name) : null;
        const fs = req("fs");
        const path = req("path");
        if (fs && path) {
          const cleanPath = input.replace(/^\//, "");
          const filePath = path.resolve(process.cwd(), "public", cleanPath);
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            const bytes = new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
            const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
            return { bytes, type: isPng ? "png" : "jpg" };
          }
        }
      }
    } catch (e) {
      console.warn("Could not load image bytes:", input, e);
    }
  }
  return null;
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
  kopConfig?: KOPConfig;
}): Promise<Uint8Array> {
  try {
    console.log("🔵 Loading PDF template...");

    let templateBytes: ArrayBuffer;
    if (typeof window !== "undefined" && typeof window.fetch === "function") {
      // Browser environment
      templateBytes = await fetch("/templates/sop_template.pdf").then((r) =>
        r.arrayBuffer()
      );
    } else {
      // Node.js environment (for testing / SSR)
      const req = (name: string) => (globalThis as any)["require"] ? (globalThis as any)["require"](name) : null;
      const fs = req("fs");
      const path = req("path");
      if (fs && path) {
        const tplPath = path.resolve(process.cwd(), "public/templates/sop_template.pdf");
        const fileBuf = fs.readFileSync(tplPath);
        templateBytes = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);
      } else {
        templateBytes = await fetch("/templates/sop_template.pdf").then((r) =>
          r.arrayBuffer()
        );
      }
    }

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

    // Helper: Tulis teks biasa (single line, no wrap) - digunakan untuk header nomor SOP dll
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

    // Header fields (bagian atas KOP - nomor, tanggal pembuatan, tanggal revisi, tanggal efektif)
    write(page1, nomor, 590, 535, 10);
    write(page1, tanggalPembuatan, 590, 523, 10);
    write(page1, tanggalRevisi || "-", 590, 511, 10);
    write(page1, tanggalEfektif, 590, 498, 10);

    // Center title SOP
    const judulWidth = fontBold.widthOfTextAtSize(namaSop, 12);
    const centerX = (page1.getWidth() - judulWidth) / 2;
    write(page1, namaSop, centerX, 405, 12, true);

    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);

    // =========================================================================
    // CUSTOM KOP & PENGESAHAN OVERLAY (Presisi Sesuai Grid Template Asli)
    // =========================================================================
    const DEFAULT_INSTANSI = "Badan Pusat Statistik Kota Surabaya";
    const DEFAULT_KEPALA_INSTANSI = "Kepala Badan Pusat Statistik Kota Surabaya";
    const DEFAULT_SUB_BAGIAN = "Kepala Sub. Bagian Tata Usaha";
    const DEFAULT_JABATAN_PENGESAH = "Kepala BPS Kota Surabaya";
    const DEFAULT_NAMA_PENGESAH = "Dr. Arrief Chandra Setiawan, SST., M.Si.";
    const DEFAULT_NIP_PENGESAH = "NIP. 196508161992031001";

    const kopConfig = params.kopConfig;

    // Helper: embed PNG atau JPG
    const embedImageToDoc = async (imgData: { bytes: Uint8Array; type: "png" | "jpg" }) => {
      if (imgData.type === "png") {
        return await pdfDoc.embedPng(imgData.bytes);
      } else {
        return await pdfDoc.embedJpg(imgData.bytes);
      }
    };

    // A. CUSTOM INSTANSI (Baris 1 KOP Kiri Atas)
    if (kopConfig?.instansi && kopConfig.instansi.trim() && kopConfig.instansi.trim() !== DEFAULT_INSTANSI) {
      page1.drawRectangle({
        x: 188.5,
        y: 532.1,
        width: 279.5,
        height: 11.2,
        color: white,
        borderWidth: 0,
      });
      const txt = kopConfig.instansi.trim();
      let sz = 9.48;
      const tw = fontRegular.widthOfTextAtSize(txt, sz);
      if (tw > 270) sz = Math.max(6.5, (270 / tw) * sz);
      page1.drawText(txt, {
        x: 193.5,
        y: 535.1,
        size: sz,
        font: fontRegular,
        color: black,
      });
    }

    // B. CUSTOM KEPALA INSTANSI (Baris 2 KOP Kiri Atas)
    if (kopConfig?.kepalaInstansi && kopConfig.kepalaInstansi.trim() && kopConfig.kepalaInstansi.trim() !== DEFAULT_KEPALA_INSTANSI) {
      page1.drawRectangle({
        x: 188.5,
        y: 520.2,
        width: 279.5,
        height: 11.2,
        color: white,
        borderWidth: 0,
      });
      const txt = kopConfig.kepalaInstansi.trim();
      let sz = 9.48;
      const tw = fontRegular.widthOfTextAtSize(txt, sz);
      if (tw > 270) sz = Math.max(6.5, (270 / tw) * sz);
      page1.drawText(txt, {
        x: 193.5,
        y: 523.2,
        size: sz,
        font: fontRegular,
        color: black,
      });
    }

    // C. CUSTOM SUB BAGIAN (Baris 3 KOP Kiri Atas)
    if (kopConfig?.subBagian && kopConfig.subBagian.trim() && kopConfig.subBagian.trim() !== DEFAULT_SUB_BAGIAN) {
      page1.drawRectangle({
        x: 188.5,
        y: 508.2,
        width: 279.5,
        height: 11.2,
        color: white,
        borderWidth: 0,
      });
      const txt = kopConfig.subBagian.trim();
      let sz = 9.48;
      const tw = fontRegular.widthOfTextAtSize(txt, sz);
      if (tw > 270) sz = Math.max(6.5, (270 / tw) * sz);
      page1.drawText(txt, {
        x: 193.5,
        y: 511.3,
        size: sz,
        font: fontRegular,
        color: black,
      });
    }

    // D. PENGESAHAN (Kotak Kanan Atas: Jabatan, Stempel, TTD, Nama, NIP)
    const customJabatan = Boolean(kopConfig?.jabatanPengesah && kopConfig.jabatanPengesah.trim() && kopConfig.jabatanPengesah.trim() !== DEFAULT_JABATAN_PENGESAH);
    const customNama = Boolean(kopConfig?.namaPengesah && kopConfig.namaPengesah.trim() && kopConfig.namaPengesah.trim() !== DEFAULT_NAMA_PENGESAH);
    const customNip = Boolean(kopConfig?.nipPengesah && kopConfig.nipPengesah.trim() && kopConfig.nipPengesah.trim() !== DEFAULT_NIP_PENGESAH);
    const hasCustomStempel = Boolean(kopConfig?.stempelImage);
    const hasCustomTtd = Boolean(kopConfig?.ttdImage);

    if (customJabatan || customNama || customNip || hasCustomStempel || hasCustomTtd) {
      // Tutup area dalam kotak pengesahan secara presisi tanpa merusak garis border
      page1.drawRectangle({
        x: 582.0,
        y: 424.5,
        width: 295.5,
        height: 70.7,
        color: white,
        borderWidth: 0,
      });

      // 1. Jabatan Pengesah
      const jabatanText = kopConfig?.jabatanPengesah?.trim() || DEFAULT_JABATAN_PENGESAH;
      let szJabatan = 9.48;
      const twJabatan = fontRegular.widthOfTextAtSize(jabatanText, szJabatan);
      if (twJabatan > 280) szJabatan = Math.max(6.5, (280 / twJabatan) * szJabatan);
      page1.drawText(jabatanText, {
        x: 587.0,
        y: 486.6,
        size: szJabatan,
        font: fontRegular,
        color: black,
      });

      // 2. Stempel (Target box asli: X: 588.00, Y: 423.01, MaxW: 78.05, MaxH: 83.07)
      const stempelData = await resolveImageBytes(kopConfig?.stempelImage || "/templates/default_X2.jpg");
      if (stempelData) {
        try {
          const stempelImg = await embedImageToDoc(stempelData);
          const maxW = 78.05;
          const maxH = 83.07;
          let drawW = maxW;
          let drawH = maxH;
          if (stempelImg.width && stempelImg.height) {
            const aspect = stempelImg.width / stempelImg.height;
            drawW = maxW;
            drawH = maxW / aspect;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = maxH * aspect;
            }
          }
          page1.drawImage(stempelImg, {
            x: 588.00,
            y: 423.01,
            width: drawW,
            height: drawH,
          });
        } catch (stErr) {
          console.warn("Gagal menempelkan stempel:", stErr);
        }
      }

      // 3. Tanda Tangan (Target box asli: X: 642.00, Y: 436.97, MaxW: 78.21, MaxH: 54.21)
      const ttdData = await resolveImageBytes(kopConfig?.ttdImage || "/templates/default_X0.jpg");
      if (ttdData) {
        try {
          const ttdImg = await embedImageToDoc(ttdData);
          const maxW = 82;
          const maxH = 52;
          let drawW = maxW;
          let drawH = maxH;
          if (ttdImg.width && ttdImg.height) {
            const aspect = ttdImg.width / ttdImg.height;
            drawW = maxW;
            drawH = maxW / aspect;
            if (drawH > maxH) {
              drawH = maxH;
              drawW = maxH * aspect;
            }
          }
          page1.drawImage(ttdImg, {
            x: 642.00,
            y: 436.97,
            width: drawW,
            height: drawH,
          });
        } catch (ttdErr) {
          console.warn("Gagal menempelkan TTD:", ttdErr);
        }
      }

      // 4. Nama Pejabat Pengesah (Bold & Underline)
      const namaText = kopConfig?.namaPengesah?.trim() || DEFAULT_NAMA_PENGESAH;
      let szNama = 9.5;
      const twNama = fontBold.widthOfTextAtSize(namaText, szNama);
      if (twNama > 280) szNama = Math.max(6.5, (280 / twNama) * szNama);
      page1.drawText(namaText, {
        x: 587.0,
        y: 438.8,
        size: szNama,
        font: fontBold,
        color: black,
      });
      const finalTwNama = fontBold.widthOfTextAtSize(namaText, szNama);
      page1.drawLine({
        start: { x: 587.0, y: 437.0 },
        end: { x: 587.0 + Math.min(finalTwNama, 280), y: 437.0 },
        thickness: 0.72,
        color: black,
      });

      // 5. NIP Pejabat Pengesah
      const nipText = kopConfig?.nipPengesah?.trim() || DEFAULT_NIP_PENGESAH;
      let szNip = 9.5;
      const twNip = fontRegular.widthOfTextAtSize(nipText, szNip);
      if (twNip > 280) szNip = Math.max(6.5, (280 / twNip) * szNip);
      page1.drawText(nipText, {
        x: 587.0,
        y: 427.3,
        size: szNip,
        font: fontRegular,
        color: black,
      });
    }

    // =========================================================================
    // DYNAMIC VECTOR TABLE RENDERING FOR PAGE 1 (Tabel Mengembang Otomatis)
    // =========================================================================
    // Alih-alih menimpa teks pada template kaku, area tabel lama ditutup putih bersih
    // dan digambar ulang secara dinamis dengan tinggi baris menyesuaikan panjang isi teks.
    const borderWidth = 0.8;

    const startX = 95.4;
    const totalW = 783;
    const midX = 486.9;
    const colWLeft = midX - startX;        // 391.5 pt
    const colWRight = startX + totalW - midX; // 391.5 pt
    const tableTopY = 394.8;
    const maxTableBottomY = 84.8;
    const totalAvailableH = tableTopY - maxTableBottomY; // ~310 pt

    // 1. Bersihkan area tabel statis lama dengan warna putih
    page1.drawRectangle({
      x: startX - 1,
      y: maxTableBottomY - 10,
      width: totalW + 2,
      height: totalAvailableH + 12,
      color: white,
      borderWidth: 0,
    });

    // 2. Fungsi word-wrap fleksibel untuk teks multi-paragraf
    const wrapParagraphs = (txt: string, maxWidth: number, fs: number): string[] => {
      if (!txt || txt.trim() === "" || txt === "-") return ["-"];
      const paragraphs = txt.split("\n");
      const result: string[] = [];
      for (const para of paragraphs) {
        if (!para.trim()) {
          result.push("");
          continue;
        }
        const words = para.split(" ");
        let currentLine = "";
        for (const word of words) {
          const test = currentLine ? `${currentLine} ${word}` : word;
          if (fontRegular.widthOfTextAtSize(test, fs) > maxWidth && currentLine) {
            result.push(currentLine);
            currentLine = word;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) result.push(currentLine);
      }
      return result;
    };

    const contentWidth = colWLeft - 14;

    // 3. Tentukan font size adaptif (default 8.5 pt, jika teks sangat panjang otomatis turun ke 8 pt atau 7.5 pt)
    let fontSize = 8.5;
    let lineSpacing = 11;
    let headerH = 13.5;

    let linesDH = wrapParagraphs(dasarHukum, contentWidth, fontSize);
    let linesKP = wrapParagraphs(kualifikasiPelaksana, contentWidth, fontSize);
    let linesKT = wrapParagraphs(keterkaitan, contentWidth, fontSize);
    let linesPL = wrapParagraphs(peralatanPerlengkapan, contentWidth, fontSize);
    let linesPR = wrapParagraphs(peringatan, contentWidth, fontSize);
    let linesPC = wrapParagraphs(pencatatanPendataan, contentWidth, fontSize);
    let linesMK = wrapParagraphs(maksud, totalW - 120, fontSize);
    let linesTJ = wrapParagraphs(tujuan, totalW - 120, fontSize);

    let row1ContentH = Math.max(linesDH.length, linesKP.length, 1) * lineSpacing + 10;
    let row2ContentH = Math.max(linesKT.length, linesPL.length, 1) * lineSpacing + 10;
    let row3ContentH = Math.max(linesPR.length, linesPC.length, 1) * lineSpacing + 10;
    let rowBottomContentH = Math.max((linesMK.length + linesTJ.length) * lineSpacing + 36, 52);

    let totalNeededH = (headerH * 3) + row1ContentH + row2ContentH + row3ContentH + rowBottomContentH;

    // Jika teks luar biasa banyak, sesuaikan font size agar tetap proporsional dan muat rapi di halaman 1
    if (totalNeededH > totalAvailableH) {
      fontSize = 8.0;
      lineSpacing = 10;
      linesDH = wrapParagraphs(dasarHukum, contentWidth, fontSize);
      linesKP = wrapParagraphs(kualifikasiPelaksana, contentWidth, fontSize);
      linesKT = wrapParagraphs(keterkaitan, contentWidth, fontSize);
      linesPL = wrapParagraphs(peralatanPerlengkapan, contentWidth, fontSize);
      linesPR = wrapParagraphs(peringatan, contentWidth, fontSize);
      linesPC = wrapParagraphs(pencatatanPendataan, contentWidth, fontSize);
      linesMK = wrapParagraphs(maksud, totalW - 120, fontSize);
      linesTJ = wrapParagraphs(tujuan, totalW - 120, fontSize);

      row1ContentH = Math.max(linesDH.length, linesKP.length, 1) * lineSpacing + 10;
      row2ContentH = Math.max(linesKT.length, linesPL.length, 1) * lineSpacing + 10;
      row3ContentH = Math.max(linesPR.length, linesPC.length, 1) * lineSpacing + 10;
      rowBottomContentH = Math.max((linesMK.length + linesTJ.length) * lineSpacing + 36, 52);
      totalNeededH = (headerH * 3) + row1ContentH + row2ContentH + row3ContentH + rowBottomContentH;
    }

    // Tentukan batas bawah tabel (minimal menyentuh garis bawah asli atau melar secukupnya)
    const tableBottomY = Math.min(tableTopY - Math.max(totalNeededH, 305), maxTableBottomY);

    // 4. Render tabel dinamis baris demi baris
    let curY = tableTopY;

    const drawSectionRow = (
      labelLeft: string,
      linesLeft: string[],
      labelRight: string,
      linesRight: string[],
      contentH: number
    ) => {
      // Header band
      page1.drawRectangle({
        x: startX,
        y: curY - headerH,
        width: totalW,
        height: headerH,
        borderColor: black,
        borderWidth,
        color: white,
      });
      // Garis vertikal pemisah header di tengah
      page1.drawLine({
        start: { x: midX, y: curY },
        end: { x: midX, y: curY - headerH },
        color: black,
        thickness: borderWidth,
      });
      // Teks label header
      page1.drawText(labelLeft, {
        x: startX + 6,
        y: curY - 9.8,
        size: 9,
        font: fontRegular,
        color: black,
      });
      page1.drawText(labelRight, {
        x: midX + 6,
        y: curY - 9.8,
        size: 9,
        font: fontRegular,
        color: black,
      });
      curY -= headerH;

      // Content area
      page1.drawRectangle({
        x: startX,
        y: curY - contentH,
        width: totalW,
        height: contentH,
        borderColor: black,
        borderWidth,
        color: white,
      });
      // Garis vertikal pemisah content di tengah
      page1.drawLine({
        start: { x: midX, y: curY },
        end: { x: midX, y: curY - contentH },
        color: black,
        thickness: borderWidth,
      });

      // Teks isi kiri
      linesLeft.forEach((line, idx) => {
        page1.drawText(line, {
          x: startX + 6,
          y: curY - 10 - idx * lineSpacing,
          size: fontSize,
          font: fontRegular,
          color: black,
        });
      });

      // Teks isi kanan
      linesRight.forEach((line, idx) => {
        page1.drawText(line, {
          x: midX + 6,
          y: curY - 10 - idx * lineSpacing,
          size: fontSize,
          font: fontRegular,
          color: black,
        });
      });

      curY -= contentH;
    };

    // Render Row 1: Dasar Hukum & Kualifikasi Pelaksanaan
    drawSectionRow("Dasar Hukum :", linesDH, "Kualifikasi Pelaksanaan :", linesKP, row1ContentH);

    // Render Row 2: Keterkaitan & Peralatan/Perlengkapan
    drawSectionRow("Keterkaitan :", linesKT, "Peralatan/Perlengkapan :", linesPL, row2ContentH);

    // Render Row 3: Peringatan & Pencatatan dan Pendataan
    drawSectionRow("Peringatan :", linesPR, "Pencatatan dan Pendataan :", linesPC, row3ContentH);

    // Render Row 4: Kotak Maksud & Tujuan (Membentang penuh di bawah)
    const bottomBoxH = Math.max(curY - tableBottomY, rowBottomContentH);
    page1.drawRectangle({
      x: startX,
      y: curY - bottomBoxH,
      width: totalW,
      height: bottomBoxH,
      borderColor: black,
      borderWidth,
      color: white,
    });

    // Render Teks Maksud
    let textY = curY - 14;
    page1.drawText("Maksud:", {
      x: startX + 16,
      y: textY,
      size: 9,
      font: fontBold,
      color: black,
    });
    linesMK.forEach((line, idx) => {
      page1.drawText(line, {
        x: startX + 36,
        y: textY - (idx === 0 ? 0 : 12),
        size: fontSize,
        font: fontRegular,
        color: black,
      });
      textY -= 12;
    });

    // Render Teks Tujuan
    textY -= 6;
    page1.drawText("Tujuan:", {
      x: startX + 16,
      y: textY,
      size: 9,
      font: fontBold,
      color: black,
    });
    linesTJ.forEach((line, idx) => {
      page1.drawText(line, {
        x: startX + 36,
        y: textY - (idx === 0 ? 0 : 12),
        size: fontSize,
        font: fontRegular,
        color: black,
      });
      textY -= 12;
    });

    console.log("✅ Page 1 (COP) dynamic table completed");

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
        colName: string;
        cx: number;
        cy: number;
        symbol: string;
        label: string;
        dims: DynamicSymbolDims;
        bounds: SymbolBounds;
        stepIndex: number;
      }

      interface StepRowCoord {
        topY: number;
        bottomY: number;
        height: number;
      }

      const allStepShapes: StepShapeData[][] = [];
      const stepRowCoords: StepRowCoord[] = [];

      for (let stepIdx = 0; stepIdx < flowchartSteps.length; stepIdx++) {
        const step = flowchartSteps[stepIdx];
        const rowH = calculatedRowHeights[stepIdx];
        currentX = margin;
        const rowTopY = currentY;
        stepRowCoords.push({
          topY: rowTopY,
          bottomY: rowTopY - rowH,
          height: rowH,
        });

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
              colName,
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

      // ===== 1. DRAW PLAIN SHAPES FIRST (Clean Background & Crisp Borders) =====
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

      // ===== 2. DRAW CRISP ARROWS & CONNECTIONS ON TOP (NEVER COVERED BY SHAPES) =====
      let loopBackCount = 0;
      let jumpForwardCount = 0;

      for (let i = 0; i < allStepShapes.length; i++) {
        const currentShapes = allStepShapes[i];
        if (!currentShapes || currentShapes.length === 0) continue;

        const step = flowchartSteps[i];

        for (let j = 0; j < currentShapes.length; j++) {
          const sourceShape = currentShapes[j];
          const colName = sourceShape.colName;

          // 1. Ambil daftar koneksi untuk pelaksana ini
          let conns: FlowchartConnection[] = (step.connections && step.connections[colName]) ? [...step.connections[colName]] : [];

          // Fallback cerdas jika belum ada connections eksplisit
          if (conns.length === 0) {
            const legacyRoute = step.executorRoutes?.[colName];
            if (legacyRoute && legacyRoute.targetStep !== undefined) {
              conns.push({
                targetStep: legacyRoute.targetStep,
                targetPelaksana: legacyRoute.targetPelaksana,
              });
              if (legacyRoute.returnStep && legacyRoute.returnStep > 0) {
                conns.push({
                  targetStep: legacyRoute.returnStep,
                  targetPelaksana: legacyRoute.returnPelaksana,
                });
              }
            } else if (j === currentShapes.length - 1 || currentShapes.length === 1) {
              // Pelaksana terakhir baris (atau satu-satunya): default ke langkah berikutnya (atau 0 jika langkah terakhir)
              const defTarget = step.targetStep !== undefined ? step.targetStep : (i < allStepShapes.length - 1 ? i + 2 : 0);
              if (defTarget > 0) {
                conns.push({ targetStep: defTarget });
              }
              if (step.returnStep && step.returnStep > 0 && step.returnStep !== defTarget) {
                conns.push({ targetStep: step.returnStep });
              }
            } else if (currentShapes.length > 1) {
              // Jika bukan pelaksana terakhir di baris dan ada pelaksana lain di baris yang sama:
              // Hubungkan ke pelaksana berikutnya di baris yang sama
              const nextShape = currentShapes[j + 1];
              conns.push({
                targetStep: i + 1,
                targetPelaksana: nextShape.colName,
              });
            }
          }

          // 2. Gambar setiap koneksi keluar dari pelaksana ini
          for (const conn of conns) {
            const targetStepNum = conn.targetStep;
            if (targetStepNum === 0) continue; // Selesai (akhir alur)

            const targetIndex = targetStepNum - 1;

            // KASUS 1: Langkah yang sama (targetIndex === i) -> Antar Pelaksana Berbeda di Baris yang Sama
            if (targetIndex === i) {
              // Cari target pelaksana, atau fallback ke pelaksana lain di langkah yang sama
              const targetShape = currentShapes.find(
                (s) => s.colName === conn.targetPelaksana && s.colName !== colName
              ) || currentShapes.find((s) => s.colName !== colName);

              if (targetShape) {
                // Periksa apakah ada alur balik dari targetShape ke sourceShape pada langkah ini
                const targetConns = (step.connections?.[targetShape.colName] || []);
                const isBidirectional = targetConns.some(
                  (c) => c.targetStep === i + 1 && (c.targetPelaksana === colName || (!c.targetPelaksana && currentShapes.length === 2))
                );

                drawHorizontalStepConnection(page2, sourceShape.bounds, targetShape.bounds, isBidirectional);
              }
              continue;
            }

            // KASUS 2..4: Menuju langkah lain (targetIndex !== i)
            if (targetIndex >= 0 && targetIndex < allStepShapes.length) {
              const targetShapes = allStepShapes[targetIndex];

              if (targetIndex === i + 1) {
                // KASUS 2: Langkah Berikutnya (Maju Lurus / Siku ke Bawah)
                if (targetShapes && targetShapes.length > 0) {
                  // Pilih shape di langkah tujuan: prioritas targetPelaksana -> pelaksana sama -> shape pertama
                  const targetShape = (conn.targetPelaksana
                    ? targetShapes.find((s) => s.colName === conn.targetPelaksana)
                    : undefined)
                    || targetShapes.find((s) => s.colName === sourceShape.colName)
                    || targetShapes[0];

                  drawOrthogonalConnection(
                    page2,
                    sourceShape.bounds,
                    targetShape.bounds,
                    stepRowCoords[i]?.bottomY,
                    stepRowCoords[targetIndex]?.topY
                  );
                } else {
                  // Fallback jika langkah berikutnya belum ada pelaksana aktif yang dicentang:
                  // Hubungkan secara virtual ke posisi kolom yang sama di baris langkah berikutnya
                  const nextCoord = stepRowCoords[targetIndex];
                  const nextCy = nextCoord ? nextCoord.topY - nextCoord.height / 2 : sourceShape.cy - 44;
                  const fallbackBounds: SymbolBounds = {
                    halfW: sourceShape.dims.halfW,
                    halfH: sourceShape.dims.halfH,
                    top: { x: sourceShape.cx, y: nextCy + sourceShape.dims.halfH },
                    bottom: { x: sourceShape.cx, y: nextCy - sourceShape.dims.halfH },
                    left: { x: sourceShape.cx - sourceShape.dims.halfW, y: nextCy },
                    right: { x: sourceShape.cx + sourceShape.dims.halfW, y: nextCy },
                  };
                  drawOrthogonalConnection(
                    page2,
                    sourceShape.bounds,
                    fallbackBounds,
                    stepRowCoords[i]?.bottomY,
                    stepRowCoords[targetIndex]?.topY
                  );
                }
              } else if (targetIndex < i) {
                // KASUS 3: Balik ke Langkah Sebelumnya (Loop-Back lewat Kanal Kiri - Polosan Bebas Tabrakan)
                if (targetShapes && targetShapes.length > 0) {
                  const targetShape = (conn.targetPelaksana
                    ? targetShapes.find((s) => s.colName === conn.targetPelaksana)
                    : undefined)
                    || targetShapes.find((s) => s.colName === sourceShape.colName)
                    || targetShapes[0];

                  drawLoopBackConnection(
                    page2,
                    sourceShape,
                    targetShape,
                    pelaksanaStartX,
                    currentShapes,
                    targetShapes,
                    loopBackCount % 4,
                    stepRowCoords[i]?.bottomY,
                    stepRowCoords[targetIndex]?.topY
                  );
                  loopBackCount++;
                }
              } else if (targetIndex > i + 1) {
                // KASUS 4: Lompat ke Langkah di Bawahnya (Jump-Forward lewat Kanal Kanan - Polosan Bebas Tabrakan)
                if (targetShapes && targetShapes.length > 0) {
                  const targetShape = (conn.targetPelaksana
                    ? targetShapes.find((s) => s.colName === conn.targetPelaksana)
                    : undefined)
                    || targetShapes.find((s) => s.colName === sourceShape.colName)
                    || targetShapes[0];

                  drawJumpForwardConnection(
                    page2,
                    sourceShape,
                    targetShape,
                    pelaksanaStartX,
                    pelaksanaWidth,
                    currentShapes,
                    targetShapes,
                    jumpForwardCount % 4,
                    stepRowCoords[i]?.bottomY,
                    stepRowCoords[targetIndex]?.topY
                  );
                  jumpForwardCount++;
                }
              }
            }
          }
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