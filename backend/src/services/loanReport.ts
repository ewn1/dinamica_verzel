

import type { Book, Loan, LoanStatus, User } from "../types";

export interface LoanFilters {
  userId?: number;
  from?: string; 
  to?: string; 
  status?: LoanStatus;
}

export interface ParsedLoanFilters {
  filters: LoanFilters;
  errors: string[];
}

export interface LoanReportRow {
  id: number;
  book: string;
  user: string;
  loanDate: string; 
  status: LoanStatus;
}

export interface LoanReportData {
  books: Book[];
  users: User[];
  loans: Loan[];
}

const STATUSES: readonly LoanStatus[] = ["active", "returned"];
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  if (!DATE_FORMAT.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isLoanStatus(value: string): value is LoanStatus {
  return (STATUSES as readonly string[]).includes(value);
}


export function toLocalDay(value: string): string {
  if (DATE_FORMAT.test(value)) return value;
  return dayFormatter.format(new Date(value));
}

export function parseLoanFilters(query: Record<string, unknown>): ParsedLoanFilters {
  const errors: string[] = [];
  const filters: LoanFilters = {};

  const userId = text(query.userId);
  const from = text(query.from);
  const to = text(query.to);
  const status = text(query.status).toLowerCase();

  if (userId) {
    if (/^\d+$/.test(userId) && Number(userId) > 0) filters.userId = Number(userId);
    else errors.push("Usuário inválido.");
  }

  if (from) {
    if (isValidDate(from)) filters.from = from;
    else errors.push("Data inicial inválida. Use o formato AAAA-MM-DD.");
  }

  if (to) {
    if (isValidDate(to)) filters.to = to;
    else errors.push("Data final inválida. Use o formato AAAA-MM-DD.");
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    errors.push("A data inicial não pode ser maior que a data final.");
  }

  if (status) {
    if (isLoanStatus(status)) filters.status = status;
    else errors.push('Situação inválida. Use "active" ou "returned".');
  }

  return { filters, errors };
}

export function generateLoanReport(data: LoanReportData, filters: LoanFilters = {}): LoanReportRow[] {
  const bookTitles = new Map(data.books.map((book) => [book.id, book.title]));
  const userNames = new Map(data.users.map((user) => [user.id, user.name]));

  return data.loans
    .filter((loan) => filters.userId === undefined || loan.userId === filters.userId)
    .filter((loan) => !filters.status || loan.status === filters.status)
    .map((loan) => ({ loan, day: toLocalDay(loan.loanDate) }))
    .filter(({ day }) => (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to))
    .map(({ loan, day }) => ({
      id: loan.id,
      book: bookTitles.get(loan.bookId) ?? "Livro não encontrado",
      user: userNames.get(loan.userId) ?? "Usuário não encontrado",
      loanDate: day,
      status: loan.status,
    }))
    .sort((a, b) => b.loanDate.localeCompare(a.loanDate) || b.id - a.id);
}