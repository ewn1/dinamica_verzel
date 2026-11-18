import type { LoanStatus } from "../types";

export interface LoanReportRow {
  id: number;
  book: string;
  user: string;
  loanDate: string;
  status: LoanStatus;
}

/**
 * Protege campos CSV que possuem vírgulas,
 * aspas ou quebras de linha.
 */
function escapeCsv(value: unknown): string {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

export function generateLoansCsv(
  loans: LoanReportRow[]
): string {
  const header = [
    "livro",
    "usuario",
    "data",
    "situacao",
  ].join(",");

  const rows = loans.map((loan) =>
    [
      loan.book,
      loan.user,
      loan.loanDate,
      loan.status,
    ]
      .map(escapeCsv)
      .join(",")
  );

  return "\uFEFF" +
    [header, ...rows].join("\r\n") +
    "\r\n";
}