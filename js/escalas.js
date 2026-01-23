// js/escalas.js
// Escalas - autocomplete para PROFISSIONAL e PROCEDIMENTO

let profissionais = [];
let procedimentos = [];

let profissionalSelecionado = null;
let procedimentoSelecionado = null;

// CAMPOS PROFISSIONAL
const cpfInput = document.getElementById("cpfInput");
const nomeInput = document.getElementById("nomeInput");
const listaNomes = document.getElementById("listaNomes");

// CAMPOS PROCEDIMENTO
const procedimentoInput = document.getElementById("procedimentoInput");
const listaProcedimentos = document.getElementById("listaProcedimentos");
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
  .then(data => procedimentos = data);

// =======================
// PROFISSIONAIS
// =======================

// Busca por CPF
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

// Busca por Nome
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
// PROCEDIMENTOS (AUTOCOMPLETE)
// =======================

procedimentoInput.addEventListener("input", () => {
  const termo = procedimentoInput.value.toLowerCase();
  listaProcedimentos.innerHTML = "";

  if (termo.length < 2) {
    listaProcedimentos.style.display = "none";
    return;
  }

  procedimentos
    .filter(p =>
      p.descricao.toLowerCase().includes(termo) ||
      p.codigo.includes(termo)
    )
    .slice(0, 10)
    .forEach(p => {
      const div = document.createElement("div");
      div.textContent = `${p.codigo} - ${p.descricao}`;
      div.onclick = () => {
        procedimentoSelecionado = p;
        procedimentoInput.value = `${p.codigo} - ${p.descricao}`;

        // Habilita exames somente se for GRUPO
        if (p.tipo === "GRUPO") {
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
// INSERÇÃO NA TABELA
// =======================

document.getElementById("formEscala").addEventListener("submit", e => {
  e.preventDefault();

  if (!profissionalSelecionado) {
    alert("Selecione um profissional válido.");
    return;
  }

  if (!procedimentoSelecionado) {
    alert("Selecione um procedimento válido.");
    return;
  }

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${profissionalSelecionado.cpf}</td>
    <td>${profissionalSelecionado.nome}</td>
    <td>${procedimentoSelecionado.codigo} - ${procedimentoSelecionado.descricao}</td>
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
});
