import jsPDF from "jspdf";
import type { AircraftData } from "./aircraft-types";
import type { WBResult } from "./wb-calc";

export type LegReport = {
  location: string;
  palt: number;
  headwind: number;
  crosswind: number;
  roll: number;
  obs: number;
  grass: boolean;
  vref?: string;
};

export type ReportInput = {
  tail: string;
  pilotName: string;
  date: string;
  category: "Utility" | "Normal";
  withinLimits: boolean;
  aircraft: AircraftData;
  baseType: string;
  wb: WBResult;
  fuelGal: number;
  burnGal: number;
  takeoff: LegReport;
  landing: LegReport;
  notes?: string;
};

const n0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toString() : "—");
const n1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : "—");

export function buildReport(input: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const W = 612;
  const M = 36;
  let y = 46;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`C-172${input.baseType} WEIGHT AND BALANCE REPORT`, M, y);
  doc.setFontSize(12);
  doc.text(`C - ${input.tail.replace(/^C-?/i, "")}`, W - M, y, { align: "right" });
  y += 8;
  doc.setLineWidth(1);
  doc.line(M, y, W - M, y);
  y += 18;

  // ---- Weight table ----
  const colX = [M, M + 190, M + 280, M + 370];
  const tableW = 470;
  const rowH = 17;
  doc.setFontSize(9);
  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFillColor(232, 236, 242);
    doc.rect(M, y - 12, tableW, rowH, "F");
    doc.text("ITEM", colX[0]! + 4, y);
    doc.text("WEIGHT (lbs)", colX[1]! + 4, y);
    doc.text("ARM (in)", colX[2]! + 4, y);
    doc.text("MOMENT", colX[3]! + 4, y);
    y += rowH;
  };
  const row = (label: string, w: string, a: string, m: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (bold) {
      doc.setFillColor(244, 246, 250);
      doc.rect(M, y - 12, tableW, rowH, "F");
    }
    doc.text(label, colX[0]! + 4, y);
    doc.text(w, colX[1]! + 60, y, { align: "right" });
    doc.text(a, colX[2]! + 60, y, { align: "right" });
    doc.text(m, colX[3]! + 90, y, { align: "right" });
    doc.setDrawColor(190);
    doc.setLineWidth(0.5);
    doc.line(M, y + 5, M + tableW, y + 5);
    y += rowH;
  };

  header();
  const wb = input.wb;
  for (const r of wb.rows) row(r.label, n0(r.weight), n1(r.arm), n0(r.moment));
  row("Zero Fuel Weight", n0(wb.zeroFuel.weight), n1(wb.zeroFuel.cg), n0(wb.zeroFuel.moment), true);
  row(
    `Fuel (${input.fuelGal.toFixed(1)} US Gal @ ${input.aircraft.fuel.lbsPerGal} lb/gal)`,
    n0(wb.fuelLbs),
    n1(input.aircraft.arms.fuel),
    n0(wb.fuelLbs * input.aircraft.arms.fuel),
  );
  row("Ramp Weight", n0(wb.ramp.weight), n1(wb.ramp.cg), n0(wb.ramp.moment), true);
  row(
    "Less Start & Taxi",
    n0(input.aircraft.startTaxi.weight),
    n1(input.aircraft.arms.fuel),
    n0(input.aircraft.startTaxi.moment),
  );
  row("Take-Off Weight", n0(wb.takeoff.weight), n1(wb.takeoff.cg), n0(wb.takeoff.moment), true);
  row(
    `Fuel Burn (${input.burnGal.toFixed(1)} US Gal)`,
    n0(-wb.burnLbs),
    n1(input.aircraft.arms.fuel),
    n0(-wb.burnLbs * input.aircraft.arms.fuel),
  );
  row("Landing Weight", n0(wb.landing.weight), n1(wb.landing.cg), n0(wb.landing.moment), true);

  doc.setFont("helvetica", "bold");
  doc.text("Within C of G Limits?", colX[0]! + 4, y);
  doc.setFont("helvetica", "normal");
  doc.text(input.withinLimits ? "YES" : "NO — OUT OF LIMITS", colX[1]! + 4, y);
  const box = (x: number, label: string, checked: boolean) => {
    doc.setLineWidth(0.8);
    doc.setDrawColor(40);
    doc.rect(x, y - 8, 9, 9);
    if (checked) {
      doc.setLineWidth(1.2);
      doc.line(x + 1.5, y - 3.5, x + 3.8, y - 0.5);
      doc.line(x + 3.8, y - 0.5, x + 7.6, y - 6.5);
    }
    doc.text(label, x + 14, y);
  };
  box(colX[2]!, "Utility", input.category === "Utility");
  box(colX[3]!, "Normal", input.category === "Normal");
  y += 22;
  doc.setFontSize(9);
  doc.text(`Pilot's Name: ${input.pilotName || "________________"}`, M, y);
  doc.text(`Date: ${input.date}`, M + 260, y);
  doc.text("Pilot's Signature: ______________", M + 360, y);
  y += 8;

  // ---- CG chart ----
  const chartTop = y + 8;
  const chartH = 250;
  const chartW = 300;
  const chartL = M;
  const xMin = 34;
  const xMax = 49;
  const yMin = 1500;
  const yMax = 2600;
  const px = (cg: number) => chartL + ((cg - xMin) / (xMax - xMin)) * chartW;
  const py = (w: number) => chartTop + chartH - ((w - yMin) / (yMax - yMin)) * chartH;

  doc.setFontSize(8);
  doc.setDrawColor(215);
  doc.setLineWidth(0.3);
  for (let cg = xMin; cg <= xMax; cg++) {
    doc.line(px(cg), chartTop, px(cg), chartTop + chartH);
    if (cg % 2 === 0) doc.text(String(cg), px(cg), chartTop + chartH + 10, { align: "center" });
  }
  for (let w = yMin; w <= yMax; w += 100) {
    doc.line(chartL, py(w), chartL + chartW, py(w));
    doc.text(String(w), chartL - 4, py(w) + 3, { align: "right" });
  }
  doc.setDrawColor(60);
  doc.setLineWidth(0.8);
  doc.rect(chartL, chartTop, chartW, chartH);
  doc.setFontSize(7.5);
  doc.text("C.G. — inches aft of datum", chartL + chartW / 2, chartTop + chartH + 22, {
    align: "center",
  });

  const drawEnvelope = (
    pts: { weight: number; fwd: number; aft: number }[],
    color: [number, number, number],
  ) => {
    const sorted = [...pts].sort((a, b) => a.weight - b.weight);
    if (sorted.length < 2) return;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(1.2);
    const path: [number, number][] = [];
    for (const p of sorted) path.push([px(p.fwd), py(p.weight)]);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i]!;
      path.push([px(p.aft), py(p.weight)]);
    }
    path.push(path[0]!);
    for (let i = 0; i < path.length - 1; i++) {
      doc.line(path[i]![0], path[i]![1], path[i + 1]![0], path[i + 1]![1]);
    }
  };
  drawEnvelope(input.aircraft.envelopeUtility, [120, 130, 150]);
  drawEnvelope(input.aircraft.envelopeNormal, [20, 40, 90]);

  const plot = (label: string, cg: number, w: number, color: [number, number, number]) => {
    if (!Number.isFinite(cg) || !Number.isFinite(w)) return;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(px(cg), py(w), 3, "F");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(7);
    doc.text(label, px(cg) + 5, py(w) - 3);
    doc.setTextColor(0);
  };
  plot("ZFW", wb.zeroFuel.cg, wb.zeroFuel.weight, [90, 90, 90]);
  plot("T/O", wb.takeoff.cg, wb.takeoff.weight, [200, 120, 0]);
  plot("LDG", wb.landing.cg, wb.landing.weight, [20, 110, 70]);

  // ---- Takeoff / landing data boxes ----
  const bx = chartL + chartW + 24;
  const bw = W - M - bx;
  let by = chartTop;
  const dataBox = (title: string, leg: LegReport, extra: [string, string][]) => {
    doc.setFillColor(232, 236, 242);
    doc.rect(bx, by, bw, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, bx + 5, by + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(leg.grass ? "[x] Grass" : "[ ] Grass", bx + bw - 5, by + 11, { align: "right" });
    by += 16;
    const items: [string, string][] = [
      ["Location", leg.location || "—"],
      ["Press Alt", `${n0(leg.palt)} ft`],
      ["H-Wind", `${n0(leg.headwind)} kt`],
      ["X-Wind", `${n0(leg.crosswind)} kt`],
      ...extra,
      ["Gnd Roll", `${n0(leg.roll)} ft`],
      ["Obs Clr (50 ft)", `${n0(leg.obs)} ft`],
    ];
    for (const [k, v] of items) {
      doc.setDrawColor(200);
      doc.setLineWidth(0.4);
      doc.rect(bx, by, bw, 15);
      doc.text(k, bx + 5, by + 10.5);
      doc.setFont("helvetica", "bold");
      doc.text(v, bx + bw - 5, by + 10.5, { align: "right" });
      doc.setFont("helvetica", "normal");
      by += 15;
    }
    by += 10;
  };
  dataBox("Takeoff Data", input.takeoff, []);
  dataBox("Landing Data", input.landing, [["Vref / Appch", input.landing.vref ?? "—"]]);

  y = Math.max(chartTop + chartH + 34, by);
  if (input.notes) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(input.notes, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 10;
  }
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    "Computed values are planning figures only — always verify against the aircraft POH before flight.",
    M,
    770,
  );
  return doc;
}