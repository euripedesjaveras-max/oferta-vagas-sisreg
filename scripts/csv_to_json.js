// scripts/csv_to_json.js
// Script genérico para converter CSV (; ) em JSON
// Usado pelo GitHub Actions

const fs = require("fs");
const path = require("path");

function converter(csvPath, jsonPath) {
  const conteudo = fs.readFileSync(csvPath, "utf-8");
  const linhas = conteudo.split(/\r?\n/).filter(l => l.trim());

  const cabecalho = linhas[0].split(";").map(c => c.trim());
  const dados = [];

  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(";");
    const obj = {};

    cabecalho.forEach((campo, idx) => {
      obj[campo] = (colunas[idx] || "").trim();
    });

    dados.push(obj);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(dados, null, 2), "utf-8");
}

// ---- CONFIGURAÇÃO ----
// Aqui você controla o que converte
converter(
  "data/profissionais.csv",
  "data/profissionais.json"
);

// No futuro:
// converter("data/unidades.csv", "data/unidades.json");
// converter("data/procedimentos_exames.csv", "data/procedimentos_exames.json");
