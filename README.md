# 📚 Sistema de Biblioteca Comunitária

Projeto desenvolvido em equipe durante a dinâmica técnica da **Elite Dev / Verzel**.

## Objetivo

Digitalizar o controle de uma biblioteca comunitária, com cadastro e listagem de livros, empréstimos e devoluções, ranking dos livros mais emprestados, relatório filtrável e exportação CSV.

## Tecnologias e colaboração

- **Node.js** e **TypeScript**
- **Vite** (ferramenta de desenvolvimento do frontend)
- **ESLint** (padronização e análise estática)
- **SQLite** (banco de dados)
- **Prisma** (acesso ao banco e migrações, conforme planejamento da equipe)
- **Git e GitHub** (branches e Pull Requests)

> A estrutura final do frontend, os comandos de execução e as versões das dependências serão documentados após a configuração inicial do repositório.

## Equipe e responsabilidades

| História | Funcionalidade | Responsável | Branch sugerida |
| --- | --- | --- | --- |
| BIBL-1 | Cadastro e listagem de livros | Edwin | `feature/bibl-1-cadastro` |
| BIBL-2 | Empréstimos e devoluções | Leonardo | `feature/bibl-2-emprestimos` |
| BIBL-3 | Ranking de livros mais emprestados | Ricardo | `feature/bibl-3-ranking` |
| BIBL-4 | Relatório de empréstimos | Luan | `feature/bibl-4-relatorio` |
| BIBL-5 | Exportação CSV | João | `feature/bibl-5-exportacao` |

## Modelos de dados

Contratos propostos pela equipe; os tipos exatos de IDs e os detalhes de persistência devem acompanhar o schema implementado.

```ts
interface Book {
  id: number;
  title: string;
  author: string;
  year: number;
  totalCopies: number;
  availableCopies: number;
}

interface User {
  id: number;
  name: string;
}

interface Loan {
  id: number;
  bookId: number;
  userId: number;
  loanDate: string;
  returnDate: string | null;
  status: 'active' | 'returned';
}
```

- Inicialmente haverá **três usuários fixos**, sem login.
- Um livro pode ter vários empréstimos no histórico.
- Um usuário pode ter vários empréstimos históricos, mas **no máximo três ativos**.
- Cada empréstimo referencia um livro e um usuário.
- Empréstimo ativo: `status: 'active'` e `returnDate: null`.
- Na devolução: atualizar `status`, `returnDate` e `availableCopies` de forma consistente, preferencialmente em transação.
- Os empréstimos devolvidos permanecem no histórico.
- Ao cadastrar um livro, `availableCopies` deve iniciar igual a `totalCopies`.

## Contratos da API

| História | Método | Rota | Responsável |
| --- | --- | --- | --- |
| BIBL-1 | GET | `/books` | Edwin |
| BIBL-1 | POST | `/books` | Edwin |
| Base | GET | `/users` | A definir |
| BIBL-2 | POST | `/loans` | Leonardo |
| BIBL-2 | POST | `/loans/:id/return` | Leonardo |
| BIBL-3 | GET | `/reports/ranking` | Ricardo |
| BIBL-4 | GET | `/loans` | Luan |
| BIBL-5 | GET | `/loans/export.csv` | João |

### Filtros compartilhados

O relatório e a exportação devem aceitar os mesmos parâmetros opcionais:

| Parâmetro | Significado |
| --- | --- |
| `userId` | Identificador do leitor |
| `from` | Data inicial (formato `YYYY-MM-DD`) |
| `to` | Data final (formato `YYYY-MM-DD`) |
| `status` | `active` ou `returned` |

Exemplos:

```http
GET /loans?userId=1&from=2026-11-01&to=2026-11-18&status=active
GET /loans/export.csv?userId=1&from=2026-11-01&to=2026-11-18&status=active
```

Formato de erro proposto para padronização:

```json
{ "errors": ["mensagem"] }
```

Formato de linha do relatório proposto para integração:

```ts
interface LoanReportRow {
  id: number;
  book: string;
  user: string;
  loanDate: string;
  status: 'active' | 'returned';
}
```

### Exportação CSV

- A rota `GET /loans/export.csv` deve aplicar **os mesmos filtros** do relatório.
- Cada empréstimo corresponde a uma linha.
- Colunas: `livro`, `usuario`, `data`, `situacao`.
- O arquivo sempre contém cabeçalho, inclusive quando não houver resultados.
- Campos com vírgulas, aspas ou quebras de linha devem ser escapados corretamente.

Exemplo:

```csv
livro,usuario,data,situacao
Dom Casmurro,Ana,2026-11-12,active
```

## Histórias de usuário e critérios de aceite

### BIBL-1 — Cadastro e listagem de livros

**Responsável: Edwin**

Como bibliotecário, quero cadastrar livros e visualizar o acervo, para manter o catálogo da biblioteca atualizado e acessível.

- [ ] Cadastrar livros com título, autor, ano de publicação e quantidade de cópias.
- [ ] Exibir os livros cadastrados na listagem.
- [ ] Atualizar automaticamente a listagem após um cadastro, sem recarregar a página.
- [ ] Impedir cadastro com título vazio.
- [ ] Impedir cadastro com ano futuro.
- [ ] Impedir quantidade negativa de cópias.
- [ ] Exibir mensagens de erro quando os dados forem inválidos.

### BIBL-2 — Empréstimos e devoluções

**Responsável: Leonardo**

Como bibliotecário, quero registrar empréstimos e devoluções de livros, para controlar a circulação do acervo.

- [ ] Registrar o empréstimo de um livro para um leitor.
- [ ] Impedir empréstimos quando não houver cópias disponíveis.
- [ ] Impedir que um leitor tenha mais de três empréstimos ativos.
- [ ] Reduzir a quantidade de cópias disponíveis após um empréstimo.
- [ ] Registrar a devolução de um livro.
- [ ] Atualizar a quantidade de cópias disponíveis após a devolução.
- [ ] Manter o histórico de empréstimos e devoluções.

### BIBL-3 — Ranking de livros mais emprestados

**Responsável: Ricardo**

Como bibliotecário, quero visualizar quais livros são os mais emprestados, para entender a demanda do acervo.

- [ ] Exibir os livros ordenados pela quantidade de empréstimos.
- [ ] Mostrar o total de vezes que cada livro foi emprestado.
- [ ] Exibir um estado vazio quando ainda não houver empréstimos registrados.

### BIBL-4 — Relatório de empréstimos

**Responsável: Luan**

Como bibliotecário, quero visualizar um relatório de empréstimos com filtros, para analisar a movimentação do acervo.

- [ ] Listar livro, usuário, data e situação do empréstimo.
- [ ] Permitir filtrar por usuário.
- [ ] Permitir filtrar por período, com data inicial e final.
- [ ] Permitir filtrar por situação: ativo ou devolvido.
- [ ] Permitir combinar os filtros.
- [ ] Exibir um estado vazio quando nenhum registro corresponder aos filtros.

### BIBL-5 — Exportação do relatório de empréstimos

**Responsável: João**

Como bibliotecário, quero exportar o relatório de empréstimos em CSV, para compartilhar ou arquivar as informações.

- [ ] Disponibilizar a exportação a partir da tela de relatório.
- [ ] Gerar um arquivo CSV.
- [ ] Incluir uma linha por empréstimo.
- [ ] Incluir livro, usuário, data e situação.
- [ ] Incluir cabeçalho identificando as colunas.
- [ ] Respeitar os filtros aplicados no relatório.
- [ ] Permitir exportação sem resultados, gerando apenas o cabeçalho.

## Dependências e ordem sugerida de integração

```text
Base (schema, Prisma, usuários, app)
  └── BIBL-1 Edwin (livros)
        └── BIBL-2 Leonardo (empréstimos)
              ├── BIBL-3 Ricardo (ranking)
              └── BIBL-4 Luan (relatório e filtros)
                    └── BIBL-5 João (CSV)
```

**Caminho crítico de integração:** Base → Edwin → Leonardo → Luan → João. Ricardo pode integrar em paralelo ao relatório. Essa sequência **não impede desenvolvimento simultâneo**: cada integrante pode começar com dados simulados e interfaces compartilhadas.

| Responsável | Depende de | Pode adiantar sem integração |
| --- | --- | --- |
| Edwin | Base | Cadastro, validações e listagem |
| Leonardo | Base e livros | Regras de empréstimo/devolução e testes |
| Ricardo | Livros e empréstimos | Contagem, ordenação e testes |
| Luan | Empréstimos, livros e usuários | Filtros, consulta, testes e interface |
| João | Linhas filtradas do relatório | Geração de CSV, escape e testes |

### Acordos de integração

- **Base:** `schema.prisma`, primeira migração, seed de três usuários, instância Prisma, inicialização do servidor e `GET /users`. Definir o responsável.
- **Edwin:** garantir que `availableCopies` comece igual a `totalCopies`.
- **Leonardo:** registrar empréstimos e devoluções preservando histórico e consistência de estoque.
- **Luan:** disponibilizar cedo o contrato das funções `parseLoanFilters`, `findLoans` e `buildLoanQuery` (nomes propostos no mapa de dependências).
- **João:** gerar o CSV a partir das linhas filtradas, sem duplicar a lógica do relatório.
- **Todos:** manter modelos, formatos de datas, respostas e erros consistentes.

### Fluxo de Git

1. O responsável configura a base do projeto na `main`.
2. Cada integrante clona o repositório e cria sua branch de funcionalidade.
3. As implementações podem ser desenvolvidas e testadas com dados simulados.
4. Cada integrante envia commits e abre um Pull Request.
5. A equipe revisa e integra gradualmente, priorizando dependências.
6. Após os merges, valida o sistema integrado e os critérios de aceite.

**Revisões sugeridas:** Leonardo revisa Edwin; Luan revisa Leonardo; João revisa Luan; Ricardo e Edwin podem apoiar as demais revisões.

## Como executar

> A preencher após a criação da estrutura do repositório, incluindo instalação das dependências, configuração do SQLite/Prisma, migrações, seed, execução do backend/frontend e testes.

## Entrega

Uma solução integrada, construída colaborativamente, com foco no atendimento aos critérios de aceite e na clareza da integração entre as histórias.
