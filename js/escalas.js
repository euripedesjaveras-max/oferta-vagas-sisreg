// js/escalas.js
// Escalas - procedimentos com campo de exames em texto livre

let profissionais = [];
let procedimentos = [];
let profissionalSelecionado = null;

// CAMPOS
const cpfInput = document.getElementById("cpfInput");
const nomeInput = document.getElementById("nomeInput");
const listaNomes = document.getElementById("listaNomes");

const procedimentoSelect = document.getElementById("procedimentoSelect");
const examesInput = document.getElementById("examesInput");

// =======================
// CARREGAMENTO DE DADOS
// =======================

// Profissionais
fetch("data/profissionais.json?v=" + Date.now())
  .then(r => r.json())
  .then(data => profissionais = data);

// Procedimentos
fetch("data/procedimentos_exames.json?v=" + Date.now())
  .then(r => r.json())
  .then(data => {
    procedimentos = data;
    carregarProcedimentos();
  });

// =======================
// PROFISSIONAIS
// =======================

cpfInput.addEventListener("blur", () => {
  const cpf = cpfInput.value.trim();
  if (!cpf) return;

  const prof = profissionais.find(p => p.cpf === cpf);
  if (prof) {
    profissionalSelecionado = prof;
    nomeInput.value = prof.nome;
  } else {
    alert("CPF não encontrado.");
    nomeInput.value = "";
    profissionalSelecionado = null;
  }
});

nomeInput.addEventListener("input", () => {
  const termo = nomeInput.value.toLowerCase();
  listaNomes.innerHTML = "";

  if (termo.length < 2) {
    listaNomes.style.display = "none";
    return;
  }

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
        listaNomes.style.display = "none";
      };
      listaNomes.appendChild(div);
    });

  listaNomes.style.display = "block";
});

// =======================
// PROCEDIMENTOS
// =======================

function carregarProcedimentos() {
  procedimentoSelect.innerHTML = `<option value="">Selecione...</option>`;

  procedimentos.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.codigo;
    opt.textContent = `${p.codigo} - ${p.descricao}`;
    opt.dataset.tipo = p.tipo;
    procedimentoSelect.appendChild(opt);
  });
}

procedimentoSelect.addEventListener("change", () => {
  const opt = procedimentoSelect.selectedOptions[0];

  if (!opt || opt.dataset.tipo !== "GRUPO") {
    examesInput.value = "";
    examesInput.disabled = true;
    return;
  }

  examesInput.disabled = false;
});

// =======================
// INSERÇÃO NA TABELA
// =======================

document.getElementById("formEscala").addEventListener("submit", e => {
  e.preventDefault();

  if (!profissionalSelecionado) {
    alert("Selecione um profissional válido.");
    return;
  }

  const procedimentoTexto =
    procedimentoSelect.selectedOptions[0].textContent;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${profissionalSelecionado.cpf}</td>
    <td>${profissionalSelecionado.nome}</td>
    <td>${procedimentoTexto}</td>
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
});
