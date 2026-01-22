// js/escalas.js
// Página ESCALAS
// - Busca profissional por CPF ou nome
// - Insere oferta na tabela
// - Permite excluir linhas

let profissionais = [];
let profissionalSelecionado = null;

/*
  Carrega lista de profissionais do JSON
*/
fetch("data/profissionais.json")
  .then(res => res.json())
  .then(data => {
    profissionais = data;
  });

const inputBusca = document.getElementById("buscaProfissional");
const listaResultados = document.getElementById("listaResultados");

/*
  Evento de digitação para busca dinâmica
*/
inputBusca.addEventListener("input", () => {
  const termo = inputBusca.value.toLowerCase();
  listaResultados.innerHTML = "";

  if (termo.length < 2) {
    listaResultados.style.display = "none";
    return;
  }

  const resultados = profissionais.filter(p =>
    p.cpf.includes(termo) ||
    p.nome.toLowerCase().includes(termo)
  );

  resultados.slice(0, 10).forEach(p => {
    const div = document.createElement("div");
    div.textContent = `${p.nome} (${p.cpf})`;
    div.style.cursor = "pointer";
    div.style.padding = "4px";

    /*
      Ao clicar, fixa o profissional selecionado
    */
    div.onclick = () => {
      profissionalSelecionado = p;
      inputBusca.value = `${p.nome} (${p.cpf})`;
      listaResultados.style.display = "none";
    };

    listaResultados.appendChild(div);
  });

  listaResultados.style.display = resultados.length ? "block" : "none";
});

/*
  Inserção na tabela
*/
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

  /*
    Limpa formulário após inserção
  */
  e.target.reset();
  profissionalSelecionado = null;
});
