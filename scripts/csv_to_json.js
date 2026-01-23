// scripts/csv_to_json.js
// Converte CSV (;) em JSON
// Usado pelo GitHub Actions
// Inclui blindagem de CPF e conversão de procedimentos

const fs = require("fs");

/*
  Normaliza CPF:
  - Remove tudo que não for número
  - Garante 11 dígitos com zeros à esquerda
*/
function normalizarCpf(valor) {
  if (!valor) return "";
  const numeros = valor.replace(/\D/g, "");
  return numeros.padStart(11, "0");
}

/*
  Converte um CSV genérico para JSON
*/
function converter(csvPath, jsonPath, opcoes = {}) {
  const conteudo = fs.readFileSync(csvPath, "utf-8");
  const linhas = conteudo.split(/\r?\n/).filter(l => l.trim());

  const cabecalho = linhas[0].split(";").map(c => c.trim());
  const dados = [];

  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(";");
    const obj = {};

    cabecalho.forEach((campo, idx) => {
      let valor = (colunas[idx] || "").trim();

      // Blindagem específica para CPF
      if (campo.toLowerCase() === "cpf" && opcoes.cpf) {
        valor = normalizarCpf(valor);
      }

      obj[campo] = valor;
    });

    dados.push(obj);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(dados, null, 2), "utf-8");
}

// ==============================
// CONVERSÕES ATIVAS
// ==============================

// PROFISSIONAIS
converter(
  "data/profissionais.csv",
  "data/profissionais.json",
  { cpf: true }
);

// PROCEDIMENTOS / EXAMES
converter(
  "data/procedimentos_exames.csv",
  "data/procedimentos_exames.json"
);

// UNIDADES 
converter(
  "data/unidades.csv",
  "data/unidades.json"
);
