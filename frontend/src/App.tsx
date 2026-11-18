import { useState } from "react";
import BooksPage from "./pages/BooksPage";
import LoansPage from "./pages/LoansPage";
import RankingPage from "./pages/RankingPage";
import ReportPage from "./pages/ReportPage";

const TABS = [
  { key: "books", label: "Acervo" },
  { key: "loans", label: "Empréstimos" },
  { key: "ranking", label: "Ranking" },
  { key: "report", label: "Relatório" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function App() {
  const [tab, setTab] = useState<TabKey>("books");

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <h1>Biblioteca</h1>
      <nav style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            disabled={tab === item.key}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === "books" && <BooksPage />}
      {tab === "loans" && <LoansPage />}
      {tab === "ranking" && <RankingPage />}
      {tab === "report" && <ReportPage />}
    </main>
  );
}
