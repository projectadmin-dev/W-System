/**
 * Rate Card Data & Utility Functions for Commercial Calculator
 */

export interface RateCardEntry {
  type: string;
  group: string;
  role: string;
  hpp: number;
  specialRate: number;
  publishRate: number;
}

export interface ManpowerRow {
  id: string;
  type: string;
  group: string;
  roleIndex: number;
  nama: string;
  qty: number;
  months: number;
}

export interface Deductions {
  pajak: number;
  founderFee: number;
  managementFee: number;
  seFee: number;
}

export interface ToppAllocation {
  cogsPct: number;
  opexPct: number;
}

export interface ProjectInfo {
  projectName: string;
  pic: string;
  status: string;
  type: string;
}

export const RATE_CARD: RateCardEntry[] = [
  { type: "Consultant", group: "AA", role: "Consultant Finance", hpp: 16775016, specialRate: 28014277, publishRate: 30530529 },
  { type: "Consultant", group: "BN", role: "Consultant IT & Data", hpp: 11228418, specialRate: 18751458, publishRate: 20435721 },
  { type: "Consultant", group: "CH", role: "Consultant Networking", hpp: 8163000, specialRate: 13632210, publishRate: 14856660 },
  { type: "Consultant", group: "DM", role: "Creative", hpp: 16000000, specialRate: 26720000, publishRate: 29120000 },
  { type: "Consultant", group: "FM", role: "Consultant OT", hpp: 12792078, specialRate: 21362770, publishRate: 23281582 },
  { type: "Consultant", group: "IL", role: "Consultant Digital Transformation", hpp: 21784875, specialRate: 36380741, publishRate: 39648472 },
  { type: "Consultant", group: "IP", role: "Consultant Digital Transformation", hpp: 30482408, specialRate: 50905621, publishRate: 55477983 },
  { type: "Consultant", group: "PR", role: "Consultant Digital Transformation", hpp: 15597398, specialRate: 26047655, publishRate: 28387264 },
  { type: "Consultant", group: "Support", role: "Technical Writer", hpp: 6000000, specialRate: 10020000, publishRate: 10920000 },
  { type: "Consultant", group: "Support", role: "Design", hpp: 8000000, specialRate: 13360000, publishRate: 14560000 },
  { type: "Networking", group: "JUN-NET", role: "Wildan", hpp: 3530000, specialRate: 5895100, publishRate: 6424600 },
  { type: "Networking", group: "MED-NET", role: "Jefry", hpp: 5000000, specialRate: 8350000, publishRate: 9100000 },
  { type: "Networking", group: "SENIOR-NET", role: "Chris", hpp: 8163000, specialRate: 13632210, publishRate: 14856660 },
  { type: "Networking", group: "SENIOR-NET", role: "Yana", hpp: 6500000, specialRate: 10855000, publishRate: 11830000 },
  { type: "Networking", group: "SENIOR-NET", role: "Aji", hpp: 7500000, specialRate: 12525000, publishRate: 13650000 },
  { type: "Project", group: "Founder-PROJ", role: "PM / BA Founder", hpp: 16780305, specialRate: 28023109, publishRate: 30540155 },
  { type: "Project", group: "Founder-PROJ", role: "Dev Founder", hpp: 13905665, specialRate: 23222461, publishRate: 25308310 },
  { type: "Project", group: "JUN-PROJ", role: "Backend", hpp: 6000000, specialRate: 10020000, publishRate: 11500000 },
  { type: "Project", group: "JUN-PROJ", role: "Frontend", hpp: 5575614, specialRate: 9311275, publishRate: 11500000 },
  { type: "Project", group: "JUN-PROJ", role: "Mobile", hpp: 5375614, specialRate: 8977275, publishRate: 11500000 },
  { type: "Project", group: "MED-PROJ", role: "PM / SA", hpp: 9451304, specialRate: 15783678, publishRate: 17201373 },
  { type: "Project", group: "MED-PROJ", role: "Backend", hpp: 8451304, specialRate: 14113678, publishRate: 15381373 },
  { type: "Project", group: "MED-PROJ", role: "Frontend", hpp: 8451304, specialRate: 14113678, publishRate: 15381373 },
  { type: "Project", group: "MED-PROJ", role: "Mobile", hpp: 8451304, specialRate: 14113678, publishRate: 15381373 },
  { type: "Project", group: "SENIOR-PROJ", role: "PM / SA", hpp: 12179422, specialRate: 20339635, publishRate: 22166548 },
  { type: "Project", group: "SENIOR-PROJ", role: "Backend", hpp: 12179422, specialRate: 20339635, publishRate: 22166548 },
  { type: "Project", group: "SENIOR-PROJ", role: "Frontend", hpp: 12179422, specialRate: 20339635, publishRate: 22166548 },
  { type: "Project", group: "SENIOR-PROJ", role: "Mobile", hpp: 12179422, specialRate: 20339635, publishRate: 22166548 },
  { type: "Project", group: "Support-PROJ", role: "DevOps", hpp: 11000000, specialRate: 18370000, publishRate: 20020000 },
  { type: "Project", group: "Support-PROJ", role: "UI/UX", hpp: 8000000, specialRate: 13360000, publishRate: 14560000 },
  { type: "Project", group: "Support-PROJ", role: "QA/QC", hpp: 10000000, specialRate: 16700000, publishRate: 18200000 },
  { type: "Project", group: "Support-PROJ", role: "Technical Writer", hpp: 6000000, specialRate: 10020000, publishRate: 10920000 },
  { type: "Project", group: "Support-PROJ", role: "Dev Surabaya", hpp: 8000000, specialRate: 13360000, publishRate: 14560000 },
  { type: "Web", group: "FOUNDER-WEB", role: "Rendy", hpp: 10302308, specialRate: 17204854, publishRate: 18750201 },
  { type: "Web", group: "MED-WEB", role: "Holis", hpp: 3350000, specialRate: 5594500, publishRate: 6097000 },
  { type: "Web", group: "SENIOR-WEB", role: "Randy", hpp: 3500000, specialRate: 5845000, publishRate: 6370000 },
  { type: "Web", group: "SENIOR-WEB", role: "Ramzi", hpp: 4500000, specialRate: 7515000, publishRate: 8190000 },
  { type: "WMS", group: "JUN-WMS", role: "Faza", hpp: 5850000, specialRate: 9769500, publishRate: 10647000 },
  { type: "WMS", group: "MED-WMS", role: "Ryhman", hpp: 4737678, specialRate: 7911922, publishRate: 8622574 },
  { type: "WMS", group: "MED-WMS", role: "Diesha", hpp: 4000000, specialRate: 6680000, publishRate: 7280000 },
  { type: "WMS", group: "SENIOR-WMS", role: "Agus", hpp: 10000000, specialRate: 16700000, publishRate: 18200000 },
];

export const PROJECT_TYPES = ["Consultant", "Networking", "Project", "Web", "WMS"];
export const PROJECT_STATUSES = ["Draft", "Submitted", "Negotiation", "Won", "Lost", "On Hold"];

export function fmtIDR(n: number): string {
  if (!n || isNaN(n)) return "IDR 0";
  return "IDR " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function parseIDR(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/IDR\s?/gi, "").replace(/\./g, "").replace(",", ".");
  return Number(cleaned) || 0;
}

export function pct(n: number): string {
  if (!n || isNaN(n)) return "0%";
  return n.toFixed(1) + "%";
}

export function getGroups(type: string): string[] {
  const groups = new Set<string>();
  RATE_CARD.filter(r => r.type === type).forEach(r => groups.add(r.group));
  return Array.from(groups).sort();
}

export function getRoles(type: string, group: string): RateCardEntry[] {
  return RATE_CARD.filter(r => r.type === type && r.group === group);
}

export function getRoleEntry(type: string, group: string, roleName: string): RateCardEntry | undefined {
  return RATE_CARD.find(r => r.type === type && r.group === group && r.role === roleName);
}

export function getEntryByIndex(index: number): RateCardEntry | undefined {
  return RATE_CARD[index];
}

export function calcRow(entry: RateCardEntry | undefined, qty: number, months: number) {
  if (!entry) return { hpp: 0, publish: 0, special: 0 };
  const q = qty || 0;
  const m = months || 0;
  return {
    hpp: entry.hpp * q * m,
    publish: entry.publishRate * q * m,
    special: entry.specialRate * q * m,
  };
}

export function getDeductions(total: number, d: Deductions) {
  const pajak = d.pajak || 0;
  const founder = d.founderFee || 0;
  const mgmt = d.managementFee || 0;
  const se = d.seFee || 0;
  const totalRate = pajak + founder + mgmt + se;
  return {
    pajakVal: total * pajak / 100,
    founderVal: total * founder / 100,
    mgmtVal: total * mgmt / 100,
    seVal: total * se / 100,
    totalDeduct: total * totalRate / 100,
    totalRate,
  };
}

export interface SummaryResult {
  totalHPP: number;
  totalPublish: number;
  totalSpecial: number;
  maxMonths: number;
  salesProject: number;
  profitPublish: number;
  marginPublish: number;
  profitActual: number;
  marginActual: number;
  variance: number;
  variancePct: number;
  discPublish: number;
  discSpecial: number;
  quotVsPublish: number;
  cogsAmount: number;
  opexAmount: number;
  statusMargin: string;
  opexHPP: number;
  opexActualVal: number;
  deductionDetails: {
    pajakVal: number;
    founderVal: number;
    mgmtVal: number;
    seVal: number;
  };
}

export function calculateSummary(
  rowsData: Array<{ entry?: RateCardEntry; qty: number; months: number }>,
  deductions: Deductions,
  topp: ToppAllocation,
  quotationPublish: number,
  actualDeal: number
): SummaryResult {
  let totalHPP = 0;
  let totalPublish = 0;
  let totalSpecial = 0;
  let maxMonths = 0;

  rowsData.forEach(({ entry, qty, months }) => {
    const calc = calcRow(entry, qty, months);
    totalHPP += calc.hpp;
    totalPublish += calc.publish;
    totalSpecial += calc.special;
    if (months > maxMonths) maxMonths = months;
  });

  const d = getDeductions(totalPublish, deductions);
  const salesProject = totalPublish - d.totalDeduct;

  const cogsAmount = salesProject * (topp.cogsPct || 0) / 100;
  const opexAmount = salesProject * (topp.opexPct || 0) / 100;

  const hppDeductions = { ...deductions };
  const dHPP = getDeductions(totalHPP, hppDeductions);
  const actualDeductions = { ...deductions };
  const dActual = getDeductions(actualDeal, actualDeductions);
  
  const opexHPP = (totalHPP - dHPP.totalDeduct) * (topp.opexPct || 0) / 100;
  const opexActualVal = (actualDeal - dActual.totalDeduct) * (topp.opexPct || 0) / 100;
  const statusMargin = opexActualVal < opexHPP ? "UNDER BUDGET" : "IDEAL";

  const profitPublish = totalPublish - totalHPP;
  const marginPublish = totalPublish > 0 ? ((totalPublish - totalHPP) / totalPublish) * 100 : 0;

  const profitActual = actualDeal - totalHPP;
  const marginActual = actualDeal > 0 ? ((actualDeal - totalHPP) / actualDeal) * 100 : 0;

  const discPublish = totalPublish > 0 ? ((totalPublish - actualDeal) / totalPublish) * 100 : 0;
  const discSpecial = totalSpecial > 0 ? ((totalSpecial - actualDeal) / totalSpecial) * 100 : 0;

  const quotVsPublish = totalPublish > 0 ? ((quotationPublish - totalPublish) / totalPublish) * 100 : 0;
  const variance = quotationPublish - actualDeal;
  const variancePct = quotationPublish > 0 ? ((quotationPublish - actualDeal) / quotationPublish) * 100 : 0;

  return {
    totalHPP,
    totalPublish,
    totalSpecial,
    maxMonths,
    salesProject,
    profitPublish,
    marginPublish,
    profitActual,
    marginActual,
    variance,
    variancePct,
    discPublish,
    discSpecial,
    quotVsPublish,
    cogsAmount,
    opexAmount,
    statusMargin,
    opexHPP,
    opexActualVal,
    deductionDetails: {
      pajakVal: d.pajakVal,
      founderVal: d.founderVal,
      mgmtVal: d.mgmtVal,
      seVal: d.seVal,
    },
  };
}
