// js/escalas.js
// Página ESCALAS
// - CPF e Nome em campos separados
// - Busca por CPF preenche Nome
// - Busca por Nome com NORMALIZAÇÃO (acentos)
// - Inserção em tabela
// - Exclusão de linhas

let profissionais = [];
let profissionalSelecionado = null;

// Campos
const cpfInput = document.getElementById("cpfInput");
const nomeInput = document.getElementById("nomeInput");
const listaNomes = document.getElementById("listaNomes");

// --------------------------------------------------
// FUNÇÃO AUXILIAR
// Normaliza texto removendo acentos e colocando em minúsculo
// Ex: "ÁBNER" -> "abner"
// --------------------------------------------------
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// --------------------------------------------------
// Carrega profissionais do JSON
// --------------------------------------------------
fetch("data/profissionais.json")
  .then(res => res.json())
  .then(data => {
    profissionais = data;
  });

// --------------------------------------------------
// BUSCA POR CPF
// Ao sair do campo CPF, busca o profissional
// --------------------------------------------------
cpfInput.addEventListener("blur", () => {
  const cpf = cpfInput.value.trim();

  if (!cpf) return;

  const prof = profissionais.find(p => p.cpf === cpf);

  if (prof) {
    profissionalSelecionado = prof;
    nomeInput.value = prof.nome;
  } else {
    alert("CPF não encontrado na base de profissionais.");
    nomeInput.value = "";
    profissionalSelecionado = null;
  }
});

// --------------------------------------------------
// BUSCA POR NOME (AUTOCOMPLETE COM NORMALIZAÇÃO)
// --------------------------------------------------
nomeInput.addEventListener("input", () => {
  const termo = normalizarTexto(nomeInput.value);
  listaNomes.innerHTML = "";

  if (termo.length < 2) {
    listaNomes.style.display = "none";
    return;
  }

  const resultados = profissionais.filter(p =>
    normalizarTexto(p.nome).includes(termo)
  );

  resultados.slice(0, 10).forEach(p => {
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

  listaNomes.style.display = resultados.length ? "block" : "none";
});

// --------------------------------------------------
// INSERÇÃO NA TABELA
// --------------------------------------------------
document.getElementById("formEscala").addEventListener("submit", e => {
  e.preventDefault();

  if (!profissionalSelecionado) {
    alert("Selecione um profissional válido.");
    return;
  }

  const tabela = document.querySelector("#tabelaEscalas tbody");
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${profissionalSelecionado.cpf}</td>
    <td>${profissionalSelecionado.nome}</td>
    <td>${procedimento.value}</td>
    <td>${exames.value}</td>
    <td>${dias.value}</td>
    <td>${horaInicio.value}</td>
    <td>${horaFim.value}</td>
    <td>${vagas.value}</td>
    <td>
      <button onclick="this.closest('tr').remove()">X</button>
    </td>
  `;

  tabela.appendChild(tr);

  // Limpa formulário
  e.target.reset();
  profissionalSelecionado = null;
  listaNomes.style.display = "none";
});
