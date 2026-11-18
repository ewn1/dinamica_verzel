import { useEffect, useRef, useState } from "react";
import { ApiError, errorMessage, getList, postOptions, request } from "./api";
import LoanTable from "./LoanTable";
import BooksPage from "./pages/BooksPage";
import LoansPage from "./pages/LoansPage";
import ReportPage from "./pages/ReportPage";
import RankingPage from "./pages/RankingPage";
import type { LoanReportRow } from "./services/loanReport";
import type { Book, User } from "./types";

const tabs = {
  overview: { title: "Visão geral", description: "Disponibilidade do acervo e atividade de empréstimos." },
  books: { title: "Livros", description: "Consulte exemplares e cadastre livros no acervo." },
  loans: { title: "Empréstimos", description: "Registre a retirada e a devolução de exemplares." },
  reports: { title: "Relatórios", description: "Consulte o histórico de empréstimos e o ranking do acervo." },
};

type Tab = keyof typeof tabs;
type Resource<T> = { items?: T[]; message?: string };

function useList<T>(path: string, enabled: boolean, revision = 0) {
  const [state, setState] = useState<Resource<T>>({});

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void getList<T>(path, controller.signal).then(
      (items) => setState({ items }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ message: error instanceof ApiError && error.status === 404
            ? "Consulta ainda indisponível na API."
            : errorMessage(error) });
        }
      },
    );
    return () => controller.abort();
  }, [path, enabled, revision]);

  return state;
}

function ResourceMessage({ message }: { message?: string }) {
  return <p className="muted" role="status">{message ?? "Carregando dados…"}</p>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; failed?: boolean }>();
  const pending = useRef(false);

  const books = useList<Book>("/books", true, revision);
  const users = useList<User>("/users", tab === "loans");
  const history = useList<LoanReportRow>("/loans", tab === "overview", revision);
  const active = useList<LoanReportRow>("/loans?status=active", tab === "loans", revision);
  const bookItems = books.items ?? [];
  const userItems = users.items ?? [];
  const recent = history.items?.slice(0, 5);
  const counts = [
    { label: "Livros cadastrados", value: books.items?.length },
    { label: "Cópias disponíveis", value: books.items?.reduce((sum, book) => sum + book.availableCopies, 0) },
    { label: "Empréstimos ativos", value: history.items?.filter((loan) => loan.status === "active").length },
  ];

  async function mutate(path: string, message: string, body?: object) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setNotice(undefined);
    try {
      await request(path, postOptions(body));
      setNotice({ text: message });
      setRevision((current) => current + 1);
      return true;
    } catch (error) {
      setNotice({ text: errorMessage(error), failed: true });
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function navigate(next: Tab) {
    setTab(next);
    setNotice(undefined);
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span>Biblioteca comunitária</span><strong>O Minimundo</strong></div>
        <nav aria-label="Navegação principal">
          {(Object.keys(tabs) as Tab[]).map((key) => (
            <button key={key} aria-current={tab === key ? "page" : undefined} onClick={() => navigate(key)}>
              {tabs[key].title}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header>
          <h1>{tabs[tab].title}</h1>
          <p>{tabs[tab].description}</p>
        </header>
        {notice && <p className={notice.failed ? "notice error" : "notice"} role={notice.failed ? "alert" : "status"}>{notice.text}</p>}
        {busy && <p className="muted" role="status">Enviando solicitação…</p>}
        {!books.items && <ResourceMessage message={books.message ? `Acervo: ${books.message}` : "Carregando acervo…"} />}
        {tab === "loans" && users.message && <ResourceMessage message={`Usuários: ${users.message}`} />}

        {tab === "overview" && (
          <>
            <dl className="metrics">
              {counts.map(({ label, value }) => (
                <div key={label}><dt>{label}</dt><dd>{value ?? "—"}</dd></div>
              ))}
            </dl>
            <section className="panel">
              <div className="panel-heading">
                <h2>Últimos empréstimos</h2>
                <button className="secondary" onClick={() => navigate("loans")}>Abrir empréstimos</button>
              </div>
              {recent ? <LoanTable loans={recent} /> :
                <ResourceMessage message={history.message} />}
            </section>
          </>
        )}
        {tab === "books" && <BooksPage books={books.items} busy={busy} onCreate={(book) => mutate("/books", "Livro cadastrado com sucesso.", book)} />}
        {tab === "loans" && <LoansPage
          books={bookItems}
          users={userItems}
          activeLoans={active.items}
          listMessage={active.message ?? "Carregando empréstimos…"}
          busy={busy}
          onBorrow={(bookId, userId) => mutate("/loans", "Empréstimo realizado com sucesso.", { bookId, userId })}
          onReturn={(id) => { void mutate(`/loans/${id}/return`, "Devolução realizada com sucesso."); }}
        />}
        {tab === "reports" && (
          <>
            <section className="panel"><RankingPage /></section>
            <div className="panel"><ReportPage /></div>
          </>
        )}
      </main>
    </div>
  );
}
