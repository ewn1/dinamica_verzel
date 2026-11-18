import { API_URL } from "../api";
import type { LoanStatus, User } from "../types";

export interface LoanReportRow {
  id: number;
  book: string;
  user: string;
  loanDate: string; 
  status: LoanStatus;
}

export interface LoanFilterValues {
  userId: string;
  from: string;
  to: string;
  status: "" | LoanStatus;
}

export const EMPTY_FILTERS: LoanFilterValues = { userId: "", from: "", to: "", status: "" };

export class ApiError extends Error {
  readonly messages: string[];

  constructor(messages: string[]) {
    super(messages.join(" "));
    this.messages = messages;
  }
}

export function buildLoanQuery(filters: LoanFilterValues): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.append(key, value);
  }
  return params.toString();
}

export async function fetchLoanReport(filters: LoanFilterValues): Promise<LoanReportRow[]> {
  const query = buildLoanQuery(filters);
  const response = await fetch(`${API_URL}/loans${query ? `?${query}` : ""}`);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const errors = (body as { errors?: string[] } | null)?.errors;
    throw new ApiError(errors?.length ? errors : ["Não foi possível carregar o relatório."]);
  }

  return body as LoanReportRow[];
}

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch(`${API_URL}/users`);
  if (!response.ok) throw new Error("Não foi possível carregar os usuários.");
  return (await response.json()) as User[];
}