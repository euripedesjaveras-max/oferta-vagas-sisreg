// scripts/csv_to_json.js
// Converte arquivos CSV (;) em JSON automaticamente
// BLINDAGEM DE CPF: garante 11 dígitos com zeros à esquerda
// Usado pelo GitHub Actions

const fs = require("fs");

/*
  Normaliza CPF:
  - Remove qualquer caractere não numérico
  - Completa com zeros à esquerda até 11 dígitos
  - Retorna sempre STRING
*/
function normalizarCpf(valor) {
  if (!valor) return "";

  // Remove tudo que não for número
  const somenteNumeros = valor.replace(/\D/g, "");

  // Completa com zeros à esquerda
  return somenteNumeros.padStart(11, "0");
}

function converter(csvPath, jsonPath) {
  const conteudo = fs.readFileSync(csvPath, "utf-8");
  const linhas = conteudo.split(/\r?\n/).filter(l => l.trim());

  const cabecalho = linhas[0].split(";").map(c => c.trim());
  const dados = [];

  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(";");
    const obj = {};

    cabecalho.forEach((campo, idx) => {
      let valor = (colunas[idx] || "").trim();

      // 🔒 BLINDAGEM ESPECÍFICA PARA CPF
      if (campo.toLowerCase() === "cpf") {
        valor = normalizarCpf(valor);
      }

      obj[campo] = valor;
    });

    dados.push(obj);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(dados, null, 2), "utf-8");
}

// ==============================
// CONFIGURAÇÃO ATUAL
// ==============================
converter(
  "data/profissionais.csv",
  "data/profissionais.json"
);

// No futuro, reutilizável para:
// converter("data/unidades.csv", "data/unidades.json");
// converter("data/procedimentos_exames.csv", "data/procedimentos_exames.json");
