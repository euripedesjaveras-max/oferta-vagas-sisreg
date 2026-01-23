// js/escalas.js
// CORREÇÃO DEFINITIVA: JS só roda após DOM carregar

document.addEventListener("DOMContentLoaded", () => {

  let profissionais = [];
  let procedimentos = [];

  let profissionalSelecionado = null;
  let procedimentoSelecionado = null;

  const cpfInput = document.getElementById("cpfInput");
  const nomeInput = document.getElementById("nomeInput");
  const listaNomes = document.getElementById("listaNomes");
  const avisoInativo = document.getElementById("avisoInativo");

  const procedimentoInput = document.getElementById("procedimentoInput");
  const listaProcedimentos = document.getElementById("listaProcedimentos");
  const examesInput = document.getElementById("examesInput");

  // =======================
  // UTIL
  // =======================

  function normalizar(txt) {
    return txt
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // =======================
  // LOAD
  // =======================

  fetch("data/profissionais.json?v=" + Date.now())
    .then(r => r.json())
    .then(d => profissionais = d);

  fetch("data/procedimentos_exames.json?v=" + Date.now())
    .then(r => r.json())
    .then(d => procedimentos = d);

  // =======================
  // PROFISSIONAIS
  // =======================

  cpfInput.addEventListener("blur", () => {
    const prof = profissionais.find(p => p.cpf === cpfInput.value.trim());
    avisoInativo.style.display = "none";

    if (prof) {
      profissionalSelecionado = prof;
      nomeInput.value = prof.nome;
      if (prof.ativo === "INATIVO") avisoInativo.style.display = "block";
    }
  });

  nomeInput.addEventListener("input", () => {
    const termo = normalizar(nomeInput.value);
    listaNomes.innerHTML = "";

    if (termo.length < 2) {
      listaNomes.style.display = "none";
      return;
    }

    profissionais
      .filter(p => normalizar(p.nome).includes(termo))
      .slice(0, 10)
      .forEach(p => {
        const div = document.createElement("div");
        div.textContent = `${p.nome} (${p.cpf})`;
        div.onclick = () => {
          profissionalSelecionado = p;
          cpfInput.value = p.cpf;
          nomeInput.value = p.nome;
          if (p.ativo === "INATIVO") avisoInativo.style.display = "block";
          listaNomes.style.display = "none";
        };
        listaNomes.appendChild(div);
      });

    listaNomes.style.display = "block";
  });

  // =======================
  // PROCEDIMENTOS — AGORA FUNCIONA
  // =======================

  function mostrarProcedimentos(termo = "") {
    listaProcedimentos.innerHTML = "";

    procedimentos
      .filter(p =>
        normalizar(p.procedimento).includes(termo) ||
        p.cod_int.includes(termo)
      )
      .slice(0, 15)
      .forEach(p => {
        const div = document.createElement("div");
        div.textContent = `${p.cod_int} - ${p.procedimento}`;
        div.onclick = () => {
          procedimentoSelecionado = p;
          procedimentoInput.value = `${p.cod_int} - ${p.procedimento}`;

          if (p.procedimento.toUpperCase().startsWith("GRUPO")) {
            examesInput.disabled = false;
          } else {
            examesInput.value = "";
            examesInput.disabled = true;
          }

          listaProcedimentos.style.display = "none";
        };
        listaProcedimentos.appendChild(div);
      });

    listaProcedimentos.style.display = "block";
  }

  procedimentoInput.addEventListener("input", () => {
    const termo = normalizar(procedimentoInput.value);
    if (termo.length >= 1) mostrarProcedimentos(termo);
  });

  procedimentoInput.addEventListener("focus", () => {
    mostrarProcedimentos("");
  });

  // =======================
  // SUBMIT
  // =======================

  document.getElementById("formEscala").addEventListener("submit", e => {
    e.preventDefault();

    if (!profissionalSelecionado || !procedimentoSelecionado) {
      alert("Selecione profissional e procedimento corretamente.");
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
    avisoInativo.style.display = "none";
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
  });

});
