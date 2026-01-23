// js/escalas.js
// VERSÃO ESTÁVEL:
// - CPF + NOME = lógica original (funcionando)
// - PROCEDIMENTO = mesma lógica do nome, trocando apenas a base

document.addEventListener("DOMContentLoaded", () => {

  let profissionais = [];
  let procedimentos = [];

  let profissionalSelecionado = null;
  let procedimentoSelecionado = null;

  // ===== CAMPOS PROFISSIONAL =====
  const cpfInput = document.getElementById("cpfInput");
  const nomeInput = document.getElementById("nomeInput");
  const listaNomes = document.getElementById("listaNomes");
  const avisoInativo = document.getElementById("avisoInativo");

  // ===== CAMPOS PROCEDIMENTO =====
  const procedimentoInput = document.getElementById("procedimentoInput");
  const listaProcedimentos = document.getElementById("listaProcedimentos");
  const examesInput = document.getElementById("examesInput");

  // =====================
  // LOAD DOS DADOS
  // =====================

  fetch("data/profissionais.json")
    .then(r => r.json())
    .then(d => profissionais = d);

  fetch("data/procedimentos_exames.json")
    .then(r => r.json())
    .then(d => procedimentos = d);

  // =====================
  // CPF (EXATAMENTE COMO ESTAVA)
  // =====================

  cpfInput.addEventListener("blur", () => {
    const cpf = cpfInput.value.trim();
    avisoInativo.style.display = "none";

    const prof = profissionais.find(p => p.cpf === cpf);
    if (prof) {
      profissionalSelecionado = prof;
      nomeInput.value = prof.nome;
      if (prof.ativo === "INATIVO") {
        avisoInativo.style.display = "block";
      }
    } else {
      profissionalSelecionado = null;
      nomeInput.value = "";
    }
  });

  // =====================
  // NOME (LÓGICA ORIGINAL)
  // =====================

  nomeInput.addEventListener("input", () => {
    listaNomes.innerHTML = "";
    avisoInativo.style.display = "none";

    const termo = nomeInput.value.toLowerCase();
    if (termo.length < 2) return;

    profissionais
      .filter(p => p.nome.toLowerCase().includes(termo))
      .slice(0, 10)
      .forEach(p => {
        const div = document.createElement("div");
        div.textContent = `${p.nome} (${p.cpf})`;
        div.onclick = () => {
          profissionalSelecionado = p;
          cpfInput.value = p.cpf;
          nomeInput.value = p.nome;
          if (p.ativo === "INATIVO") {
            avisoInativo.style.display = "block";
          }
          listaNomes.innerHTML = "";
        };
        listaNomes.appendChild(div);
      });
  });

  // =====================
  // PROCEDIMENTO
  // (MESMA LÓGICA DO NOME)
  // =====================

  procedimentoInput.addEventListener("input", () => {
    listaProcedimentos.innerHTML = "";

    const termo = procedimentoInput.value.toLowerCase();
    if (termo.length < 2) return;

    procedimentos
      .filter(p => p.procedimento.toLowerCase().includes(termo))
      .slice(0, 10)
      .forEach(p => {
        const div = document.createElement("div");
        div.textContent = `${p.cod_int} - ${p.procedimento}`;
        div.onclick = () => {
          procedimentoSelecionado = p;
          procedimentoInput.value = `${p.cod_int} - ${p.procedimento}`;

          // Exames só habilita se for GRUPO
          if (p.procedimento.toUpperCase().startsWith("GRUPO")) {
            examesInput.disabled = false;
          } else {
            examesInput.value = "";
            examesInput.disabled = true;
          }

          listaProcedimentos.innerHTML = "";
        };
        listaProcedimentos.appendChild(div);
      });
  });

  // =====================
  // SUBMIT
  // =====================

  document.getElementById("formEscala").addEventListener("submit", e => {
    e.preventDefault();

    if (!profissionalSelecionado || !procedimentoSelecionado) {
      alert("Selecione um profissional e um procedimento válidos.");
      return;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${profissionalSelecionado.cpf}</td>
      <td>${profissionalSelecionado.nome}</td>
      <td>${procedimentoSelecionado.cod_int} - ${procedimentoSelecionado.procedimento}</td>
      <td>${examesInput.value}</td>
      <td>${dias.value}</td>
      <td>${horaInicio.value}</td>
      <td>${horaFim.value}</td>
      <td>${vagas.value}</td>
      <td><button onclick="this.closest('tr').remove()">X</button></td>
    `;

    document.querySelector("#tabelaEscalas tbody").appendChild(tr);

    e.target.reset();
    examesInput.disabled = true;
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
    avisoInativo.style.display = "none";
  });

});
