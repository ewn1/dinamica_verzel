
import { describe, expect, it } from "vitest";
import {
  generateLoanReport,
  parseLoanFilters,
  toLocalDay,
  type LoanReportData,
} from "../src/services/loanReport";

const data: LoanReportData = {
  books: [
    { id: 1, title: "Dom Casmurro", author: "Machado de Assis", year: 1899, totalCopies: 3, availableCopies: 2 },
    { id: 2, title: "Capitães da Areia", author: "Jorge Amado", year: 1937, totalCopies: 2, availableCopies: 1 },
  ],
  users: [
    { id: 1, name: "Ana" },
    { id: 2, name: "Bruno" },
    { id: 3, name: "Carla" },
  ],
  loans: [
    { id: 1, bookId: 1, userId: 1, loanDate: "2026-11-01T13:00:00.000Z", returnDate: "2026-11-05T13:00:00.000Z", status: "returned" },
    { id: 2, bookId: 2, userId: 1, loanDate: "2026-11-10T13:00:00.000Z", returnDate: null, status: "active" },
    { id: 3, bookId: 1, userId: 2, loanDate: "2026-10-20T13:00:00.000Z", returnDate: null, status: "active" },
    { id: 4, bookId: 2, userId: 3, loanDate: "2026-11-15T13:00:00.000Z", returnDate: "2026-11-16T13:00:00.000Z", status: "returned" },
  ],
};

function report(query: Record<string, unknown> = {}) {
  const { filters, errors } = parseLoanFilters(query);
  expect(errors).toEqual([]);
  return generateLoanReport(data, filters);
}

const ids = (rows: { id: number }[]) => rows.map((row) => row.id).sort((a, b) => a - b);

describe("BIBL-4 - resultado do relatório", () => {
  it("lista livro, usuário, data e situação do empréstimo", () => {
    expect(report().find((row) => row.id === 1)).toEqual({
      id: 1,
      book: "Dom Casmurro",
      user: "Ana",
      loanDate: "2026-11-01",
      status: "returned",
    });
  });

  it("sem filtros, lista todos do mais recente para o mais antigo", () => {
    expect(report().map((row) => row.id)).toEqual([4, 2, 1, 3]);
  });
});

describe("BIBL-4 - filtros individuais", () => {
  it("filtra por usuário", () => {
    expect(ids(report({ userId: "1" }))).toEqual([1, 2]);
  });

  it("filtra por situação ativo", () => {
    expect(ids(report({ status: "active" }))).toEqual([2, 3]);
  });

  it("filtra por situação devolvido", () => {
    expect(ids(report({ status: "returned" }))).toEqual([1, 4]);
  });

  it("filtra só pela data inicial", () => {
    expect(ids(report({ from: "2026-11-10" }))).toEqual([2, 4]);
  });

  it("filtra só pela data final", () => {
    expect(ids(report({ to: "2026-10-31" }))).toEqual([3]);
  });

  it("filtra por período incluindo as datas inicial e final", () => {
    expect(ids(report({ from: "2026-11-01", to: "2026-11-10" }))).toEqual([1, 2]);
  });
});

describe("BIBL-4 - filtros combinados", () => {
  it("aplica usuário, período e situação ao mesmo tempo", () => {
    expect(ids(report({ userId: "1", from: "2026-11-01", to: "2026-11-30", status: "active" }))).toEqual([2]);
  });

  it("combina usuário e situação", () => {
    expect(ids(report({ userId: "1", status: "returned" }))).toEqual([1]);
  });
});

describe("BIBL-4 - estado vazio", () => {
  it("retorna lista vazia quando nenhum empréstimo corresponde aos filtros", () => {
    expect(report({ userId: "1", to: "2026-10-31" })).toEqual([]);
  });

  it("retorna lista vazia quando ainda não há empréstimos", () => {
    expect(generateLoanReport({ ...data, loans: [] })).toEqual([]);
  });
});

describe("BIBL-4 - horário de Brasília", () => {
  it("um empréstimo às 22h30 não cai no dia seguinte", () => {
    expect(toLocalDay("2026-11-02T01:30:00.000Z")).toBe("2026-11-01");
  });

  it("aceita data sem horário sem mudar o dia", () => {
    expect(toLocalDay("2026-11-01")).toBe("2026-11-01");
  });
});

describe("BIBL-4 - validação dos filtros", () => {
  it("sem filtros, não retorna filtros nem erros", () => {
    expect(parseLoanFilters({})).toEqual({ filters: {}, errors: [] });
  });

  it.each(["abc", "0", "-1", "1.5"])("recusa userId inválido: %s", (userId) => {
    expect(parseLoanFilters({ userId }).errors).toEqual(["Usuário inválido."]);
  });

  it("recusa situação inválida", () => {
    expect(parseLoanFilters({ status: "lost" }).errors).toHaveLength(1);
  });

  it("recusa data inexistente", () => {
    expect(parseLoanFilters({ from: "2026-02-30" }).errors).toHaveLength(1);
  });

  it("recusa data inicial maior que a data final", () => {
    expect(parseLoanFilters({ from: "2026-12-01", to: "2026-11-01" }).errors).toEqual([
      "A data inicial não pode ser maior que a data final.",
    ]);
  });

  it("ignora parâmetro repetido na URL em vez de quebrar", () => {
    expect(parseLoanFilters({ userId: ["1", "2"] })).toEqual({ filters: {}, errors: [] });
  });
});