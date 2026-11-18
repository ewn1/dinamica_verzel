import type { LoanReportRow } from "./services/loanReport";

type Props = {
  loans: LoanReportRow[];
  onReturn?: (id: number) => void;
  busy?: boolean;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export default function LoanTable({ loans, onReturn, busy }: Props) {
  if (!loans.length) return <p className="muted">Nenhum empréstimo encontrado.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Livro</th><th>Usuário</th><th>Data</th><th>{onReturn ? "Ação" : "Situação"}</th></tr></thead>
        <tbody>{loans.map((loan) => (
          <tr key={loan.id}>
            <td><strong>{loan.book}</strong></td>
            <td>{loan.user}</td>
            <td>{dateFormat.format(new Date(loan.loanDate))}</td>
            <td>{onReturn ? <button className="secondary" disabled={busy} onClick={() => onReturn(loan.id)}>Registrar devolução</button> :
              <span className="pill">{loan.status === "active" ? "Ativo" : "Devolvido"}</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
