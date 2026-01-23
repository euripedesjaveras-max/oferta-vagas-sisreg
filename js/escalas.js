// js/escalas.js
// Versão estável + correção APENAS do texto do procedimento

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
  // FUNÇÃO UTIL
  // remove aspas extras do texto do procedimento
  // =====================
  function limparProcedimento(txt) {
    if (!txt) return "";
    return txt.replace(/^"+|"+$/g, "");
  }

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
  // CPF (COMPORTAMENTO ORIGINAL)
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
  // NOME DO PROFISSIONAL
  // (COMPORTAMENTO ORIGINAL)
  // =====================
  nomeInput.addEventListener("input", () => {
    listaNomes.innerHTML = "";
    listaNomes.style.display = "none";
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
          listaNomes.style.display = "none";
        };
        listaNomes.appendChild(div);
      });

    listaNomes.style.display = "block";
  });

  // =====================
  // PROCEDIMENTO
  // (MESMA LÓGICA DO NOME)
  // =====================
  procedimentoInput.addEventListener("input", () => {
    listaProcedimentos.innerHTML = "";
    listaProcedimentos.style.display = "none";

    const termo = procedimentoInput.value.toLowerCase();
    if (termo.length < 2) return;

    procedimentos
      .filter(p =>
        limparProcedimento(p.procedimento).toLowerCase().includes(termo)
      )
      .slice(0, 10)
      .forEach(p => {
        const textoProcedimento = limparProcedimento(p.procedimento);

        const div = document.createElement("div");
        div.textContent = `${p.cod_int} - ${textoProcedimento}`;
        div.onclick = () => {
          procedimentoSelecionado = p;
          procedimentoInput.value = `${p.cod_int} - ${textoProcedimento}`;

          // Exames só habilita se for GRUPO
          if (textoProcedimento.toUpperCase().startsWith("GRUPO")) {
            examesInput.disabled = false;
          } else {
            examesInput.value = "";
            examesInput.disabled = true;
          }

          listaProcedimentos.innerHTML = "";
          listaProcedimentos.style.display = "none";
        };
        listaProcedimentos.appendChild(div);
      });

    listaProcedimentos.style.display = "block";
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

    const textoProcedimento = limparProcedimento(procedimentoSelecionado.procedimento);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${profissionalSelecionado.cpf}</td>
      <td>${profissionalSelecionado.nome}</td>
      <td>${procedimentoSelecionado.cod_int} - ${textoProcedimento}</td>
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
