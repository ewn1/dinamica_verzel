import cors from "cors";
import express from "express";
import { db } from "./db";
import booksRouter from "./routes/books";
import loansRouter from "./routes/loans";
import reportsRouter from "./routes/reports";
import rankingRouter from "./routes/repranking";

const app = express();
app.use(cors());
app.use(express.json());


app.get("/users", (_req, res) => {
  res.json(db.users);
});

app.use("/books", booksRouter);
app.use("/loans", loansRouter);
app.use("/reports", reportsRouter);
app.use("/ranking", rankingRouter);

app.listen(3333, () => {
  console.log("API rodando em http://localhost:3333");
});
