import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  EMPTY_FILTERS,
  fetchLoanReport,
  fetchUsers,
  type LoanFilterValues,
  type LoanReportRow,
} from "../services/loanReport";
import type { LoanStatus, User } from "../types";

const STATUS_LABEL: Record<LoanStatus, string> = {
  active: "Ativo",
  returned: "Devolvido",
};

function formatDate(day: string): string {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

const cellStyle = { textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" } as const;

export default function ReportPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<LoanFilterValues>(EMPTY_FILTERS);
  const [rows, setRows] = useState<LoanReportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const lastRequest = useRef(0);

  const runReport = useCallback((filters: LoanFilterValues) => {
    const requestId = ++lastRequest.current;
    const isLatest = () => requestId === lastRequest.current;

    return fetchLoanReport(filters)
      .then((result) => {
        if (!isLatest()) return;
        setErrors([]);
        setRows(result);
      })
      .catch((error: unknown) => {
        if (!isLatest()) return;
        setRows([]);
        setErrors(
          error instanceof ApiError ? error.messages : ["Não foi possível carregar o relatório. Tente novamente."],
        );
      })
      .finally(() => {
        if (isLatest()) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([])); 
    void runReport(EMPTY_FILTERS);
  }, [runReport]);

  function applyFilters(filters: LoanFilterValues) {
    setLoading(true);
    setErrors([]);
    void runReport(filters);
  }

  function update<K extends keyof LoanFilterValues>(key: K, value: LoanFilterValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters(form);
  }

  function handleClear() {
    setForm(EMPTY_FILTERS);
    applyFilters(EMPTY_FILTERS);
  }

  return (
    <section>
      <h2>Relatório de empréstimos</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 16 }}
      >
        <label style={{ display: "flex", flexDirection: "column" }}>
          Usuário
          <select value={form.userId} onChange={(event) => update("userId", event.target.value)}>
            <option value="">Todos</option>
            {users.map((user) => (
              <option key={user.id} value={String(user.id)}>
                {user.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column" }}>
          Data inicial
          <input type="date" value={form.from} onChange={(event) => update("from", event.target.value)} />
        </label>

        <label style={{ display: "flex", flexDirection: "column" }}>
          Data final
          <input type="date" value={form.to} onChange={(event) => update("to", event.target.value)} />
        </label>

        <label style={{ display: "flex", flexDirection: "column" }}>
          Situação
          <select
            value={form.status}
            onChange={(event) => update("status", event.target.value as LoanFilterValues["status"])}
          >
            <option value="">Todas</option>
            <option value="active">Ativo</option>
            <option value="returned">Devolvido</option>
          </select>
        </label>

        <button type="submit" disabled={loading}>
          Filtrar
        </button>
        <button type="button" onClick={handleClear} disabled={loading}>
          Limpar
        </button>
      </form>

      {errors.length > 0 && (
        <ul role="alert" style={{ color: "#c0392b" }}>
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}


      {loading && <p>Carregando...</p>}

      {!loading && errors.length === 0 && rows.length === 0 && (
        <p>Nenhum empréstimo encontrado para os filtros aplicados.</p>
      )}

      {!loading && errors.length === 0 && rows.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={cellStyle}>Livro</th>
              <th style={cellStyle}>Usuário</th>
              <th style={cellStyle}>Data</th>
              <th style={cellStyle}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={cellStyle}>{row.book}</td>
                <td style={cellStyle}>{row.user}</td>
                <td style={cellStyle}>{formatDate(row.loanDate)}</td>
                <td style={cellStyle}>{STATUS_LABEL[row.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}