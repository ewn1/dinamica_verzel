
import { useEffect, useState } from "react";
import { API_URL } from "../api";
import "./RankingPage.css";

interface RankingItem {
  bookId: number;
  title: string;
  author: string;
  totalLoans: number;
}

function isRankingItem(value: unknown): value is RankingItem {
  if (typeof value !== "object" || value === null) return false;

  return "bookId" in value && typeof value.bookId === "number"
    && Number.isInteger(value.bookId)
    && "title" in value && typeof value.title === "string"
    && "author" in value && typeof value.author === "string"
    && "totalLoans" in value && typeof value.totalLoans === "number"
    && Number.isInteger(value.totalLoans) && value.totalLoans > 0;
}

export default function RankingPage() {
  const [items, setItems] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRanking(): Promise<void> {
      try {
        const response = await fetch(API_URL + "/repranking/ranking", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Não foi possível consultar o ranking.");
        }

        const data: unknown = await response.json();

        if (!Array.isArray(data) || !data.every(isRankingItem)) {
          throw new Error("A API retornou dados inválidos.");
        }

        if (!controller.signal.aborted) {
          setItems(data);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted) {
          setItems([]);
          setError("Não foi possível carregar o ranking. Verifique se a API está rodando na porta 3333.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRanking();
    return () => controller.abort();
  }, [revision]);

  const search = query.trim().toLocaleLowerCase("pt-BR");
  const visibleItems = items
    .map((item, index) => ({ ...item, position: index + 1 }))
    .filter(item =>
      (item.title + " " + item.author).toLocaleLowerCase("pt-BR").includes(search),
    );

  function refreshRanking(): void {
    setLoading(true);
    setError("");
    setRevision(value => value + 1);
  }

  return (
    <div className="ranking-page">
      <div className="ranking-heading">
        <div>
          <h2>Livros mais emprestados</h2>
          <p>A contagem inclui empréstimos ativos e devolvidos.</p>
        </div>
        <button className="ranking-refresh" type="button" onClick={refreshRanking} disabled={loading}>
          {loading ? "Carregando..." : "Atualizar"}
        </button>
      </div>

      <label className="ranking-search">
        Buscar por livro ou autor
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Digite o título ou o autor"
        />
      </label>

      {loading && <p role="status">Carregando ranking...</p>}
      {!loading && error && <p className="ranking-error" role="alert">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p role="status">Nenhum livro foi emprestado ainda.</p>
      )}
      {!loading && !error && items.length > 0 && visibleItems.length === 0 && (
        <p role="status">Nenhum livro encontrado para esta busca.</p>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <div className="ranking-table-container">
          <table className="ranking-table">
            <caption>Ranking por quantidade de empréstimos</caption>
            <thead>
              <tr>
                <th scope="col">Posição</th>
                <th scope="col">Livro</th>
                <th scope="col">Autor</th>
                <th scope="col">Empréstimos</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(item => (
                <tr key={item.bookId}>
                  <td>{item.position}</td>
                  <td>{item.title}</td>
                  <td>{item.author}</td>
                  <td>{item.totalLoans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}