import { round2 } from "@/lib/shift-pay";

/**
 * What comes off a paycheck between gross and take-home.
 *
 * Built against four real stubs (two per employer, September 2026). Every line
 * below reproduces them: federal withholding to the cent on all four, and the
 * flat-rate lines to within a cent, which is the employer's own year-to-date
 * rounding and not something a single check can see.
 *
 * Everything is keyed by YEAR. Federal brackets, the standard deduction and
 * Washington's paid-leave rate all change each January, and a 2027 check
 * withheld against 2026 numbers would be a figure that looks authoritative and
 * isn't. So a year with no table here yields null, and the card says so,
 * rather than quietly using last year's.
 */

export const FILING_STATUSES = [
  { value: "single", label: "Single, or married filing separately" },
  { value: "married_jointly", label: "Married filing jointly" },
  { value: "head_of_household", label: "Head of household" },
] as const;

export type FilingStatus = (typeof FILING_STATUSES)[number]["value"];

export const FILING_STATUS_VALUES: readonly FilingStatus[] = FILING_STATUSES.map(
  (s) => s.value,
);

type Bracket = { upTo: number; rate: number };

type YearTables = {
  /** W-4 step 1(c) standard deduction, which the percentage method nets out. */
  standardDeduction: Record<FilingStatus, number>;
  /** Marginal brackets on income after the standard deduction; last is open. */
  brackets: Record<FilingStatus, Bracket[]>;
  socialSecurityRate: number;
  medicareRate: number;
  /** Washington Paid Family & Medical Leave, the employee's share only. */
  waPaidLeaveEmployeeRate: number;
  /** WA Cares Fund (long-term care). */
  waCaresRate: number;
};

/**
 * 2026.
 *
 * Federal figures are from Rev. Proc. 2025-32. The single 10% and 12% edges
 * and the single standard deduction are additionally verified against the
 * stubs, both with and without the two-jobs box; the other statuses are
 * transcribed and not independently checked.
 *
 * WA paid leave: 1.13% total premium, of which employees pay 71.38%. That
 * product is what all four stubs show.
 */
const TABLES: Record<number, YearTables> = {
  2026: {
    standardDeduction: {
      single: 16_100,
      married_jointly: 32_200,
      head_of_household: 24_150,
    },
    brackets: {
      single: [
        { upTo: 12_400, rate: 0.1 },
        { upTo: 50_400, rate: 0.12 },
        { upTo: 105_700, rate: 0.22 },
        { upTo: 201_775, rate: 0.24 },
        { upTo: 256_225, rate: 0.32 },
        { upTo: 640_600, rate: 0.35 },
        { upTo: Infinity, rate: 0.37 },
      ],
      married_jointly: [
        { upTo: 24_800, rate: 0.1 },
        { upTo: 100_800, rate: 0.12 },
        { upTo: 211_400, rate: 0.22 },
        { upTo: 403_550, rate: 0.24 },
        { upTo: 512_450, rate: 0.32 },
        { upTo: 768_700, rate: 0.35 },
        { upTo: Infinity, rate: 0.37 },
      ],
      head_of_household: [
        { upTo: 17_700, rate: 0.1 },
        { upTo: 67_450, rate: 0.12 },
        { upTo: 105_700, rate: 0.22 },
        { upTo: 201_775, rate: 0.24 },
        { upTo: 256_225, rate: 0.32 },
        { upTo: 640_600, rate: 0.35 },
        { upTo: Infinity, rate: 0.37 },
      ],
    },
    socialSecurityRate: 0.062,
    medicareRate: 0.0145,
    waPaidLeaveEmployeeRate: 0.0113 * 0.7138,
    waCaresRate: 0.0058,
  },
};

/** The years a take-home estimate can be made for. */
export function hasTaxTables(year: number): boolean {
  return year in TABLES;
}

function taxOn(income: number, brackets: Bracket[]): number {
  let tax = 0;
  let floor = 0;
  for (const b of brackets) {
    if (income <= floor) break;
    tax += (Math.min(income, b.upTo) - floor) * b.rate;
    floor = b.upTo;
  }
  return tax;
}

/**
 * Federal income tax withheld from one check, per IRS Publication 15-T's
 * percentage method for a 2020-or-later W-4 with nothing in steps 3 or 4.
 *
 * The check's wages are annualised, the standard deduction comes off, the
 * brackets are applied, and the annual tax is divided back down. The two-jobs
 * box (step 2(c)) halves both the deduction and every bracket edge — which is
 * why one of Kyle's employers withholds three times what the other does on
 * similar pay.
 */
export function federalWithholding(
  wagesThisCheck: number,
  periodsPerYear: number,
  status: FilingStatus,
  twoJobs: boolean,
  year: number,
): number | null {
  const t = TABLES[year];
  if (!t) return null;

  const scale = twoJobs ? 0.5 : 1;
  const annual = wagesThisCheck * periodsPerYear;
  const taxable = Math.max(0, annual - t.standardDeduction[status] * scale);
  const brackets = t.brackets[status].map((b) => ({
    upTo: b.upTo * scale,
    rate: b.rate,
  }));

  return round2(taxOn(taxable, brackets) / periodsPerYear);
}

export type Deduction = {
  key: "federal" | "social_security" | "medicare" | "wa_paid_leave" | "wa_cares" | "union_dues";
  label: string;
  amount: number;
};

export type TakeHome = {
  deductions: Deduction[];
  /** Everything withheld, dues included. */
  withheld: number;
  net: number;
};

/**
 * From gross on the check to what should land in the bank.
 *
 * Not modelled, deliberately: the Social Security wage base and the extra
 * Medicare tax (both need year-to-date pay the app doesn't have and both start
 * well above what these jobs pay), the two Washington workers'-comp lines
 * (under a dollar a year on the stubs), and anything in W-4 steps 3 or 4.
 */
export function estimateTakeHome(input: {
  gross: number;
  year: number;
  periodsPerYear: number;
  filingStatus: FilingStatus;
  twoJobs: boolean;
  /** Dues coming off THIS check, or 0. The caller knows which check it is. */
  unionDues: number;
}): TakeHome | null {
  const t = TABLES[input.year];
  if (!t) return null;

  const federal = federalWithholding(
    input.gross,
    input.periodsPerYear,
    input.filingStatus,
    input.twoJobs,
    input.year,
  );
  if (federal === null) return null;

  const deductions: Deduction[] = [
    { key: "federal", label: "Federal withholding", amount: federal },
    {
      key: "social_security",
      label: "Social Security",
      amount: round2(input.gross * t.socialSecurityRate),
    },
    { key: "medicare", label: "Medicare", amount: round2(input.gross * t.medicareRate) },
    {
      key: "wa_paid_leave",
      label: "WA paid leave",
      amount: round2(input.gross * t.waPaidLeaveEmployeeRate),
    },
    { key: "wa_cares", label: "WA Cares", amount: round2(input.gross * t.waCaresRate) },
  ];
  if (input.unionDues > 0) {
    deductions.push({ key: "union_dues", label: "Union dues", amount: round2(input.unionDues) });
  }

  const withheld = round2(deductions.reduce((sum, d) => sum + d.amount, 0));
  return { deductions, withheld, net: round2(input.gross - withheld) };
}
