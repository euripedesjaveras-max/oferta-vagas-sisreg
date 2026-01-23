// js/escalas.js
// Busca robusta + aviso INATIVO + procedimento funcional

let profissionais = [];
let procedimentos = [];

let profissionalSelecionado = null;
let procedimentoSelecionado = null;

// Campos
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

function normalizarTexto(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// =======================
// CARREGAMENTO
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
  const cpf = cpfInput.value.trim();
  const prof = profissionais.find(p => p.cpf === cpf);

  avisoInativo.style.display = "none";

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

nomeInput.addEventListener("input", () => {
  const termo = normalizarTexto(nomeInput.value);
  listaNomes.innerHTML = "";
  avisoInativo.style.display = "none";

  if (termo.length < 2) {
    listaNomes.style.display = "none";
    return;
  }

  profissionais
    .filter(p => normalizarTexto(p.nome).includes(termo))
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

        listaNomes.style.display = "none";
      };
      listaNomes.appendChild(div);
    });

  listaNomes.style.display = "block";
});

// =======================
// PROCEDIMENTOS (AGORA FUNCIONA)
// =======================

procedimentoInput.addEventListener("input", () => {
  const termo = normalizarTexto(procedimentoInput.value);
  listaProcedimentos.innerHTML = "";

  if (termo.length < 2) {
    listaProcedimentos.style.display = "none";
    return;
  }

  procedimentos
    .filter(p =>
      normalizarTexto(p.procedimento).includes(termo) ||
      p.cod_int.includes(termo)
    )
    .slice(0, 10)
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
});

// =======================
// SUBMIT
// =======================

document.getElementById("formEscala").addEventListener("submit", e => {
  e.preventDefault();

  if (!profissionalSelecionado || !procedimentoSelecionado) {
    alert("Preencha profissional e procedimento corretamente.");
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
