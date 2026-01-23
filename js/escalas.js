// js/escalas.js
// Integração com Google Sheets (ETAPA 1)

document.addEventListener("DOMContentLoaded", () => {

  // =====================
  // CONFIGURAÇÕES
  // =====================
  const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbypigQrYCUKZOfp7wwgVjyo7CgKD9aBI69jAwUObX2euWFEVbdeURinD-6ktpleXF3Glg/exec";
  const UNIDADE_ATUAL = "AGENDA TESTE"; // <-- altere conforme a unidade

  let profissionais = [];
  let procedimentos = [];

  let profissionalSelecionado = null;
  let procedimentoSelecionado = null;

  // ===== CAMPOS =====
  const cpfInput = document.getElementById("cpfInput");
  const nomeInput = document.getElementById("nomeInput");
  const listaNomes = document.getElementById("listaNomes");
  const avisoInativo = document.getElementById("avisoInativo");

  const procedimentoInput = document.getElementById("procedimentoInput");
  const listaProcedimentos = document.getElementById("listaProcedimentos");
  const examesInput = document.getElementById("examesInput");

  const diasInput = document.getElementById("dias");
  const horaInicioInput = document.getElementById("horaInicio");
  const horaFimInput = document.getElementById("horaFim");
  const vagasInput = document.getElementById("vagas");
  const vigInicioInput = document.getElementById("vigenciaInicio");
  const vigFimInput = document.getElementById("vigenciaFim");

  // =====================
  // UTIL
  // =====================
  function limparTexto(txt) {
    if (!txt) return "";
    return txt.replace(/"/g, "").trim();
  }

  function obterCodigo(p) {
    return p.cod_int || p["cod int"] || "";
  }

  // =====================
  // LOAD DOS DADOS
  // =====================
  fetch("data/profissionais.json").then(r => r.json()).then(d => profissionais = d);
  fetch("data/procedimentos_exames.json").then(r => r.json()).then(d => procedimentos = d);

  // =====================
  // CPF
  // =====================
  cpfInput.addEventListener("blur", () => {
    const prof = profissionais.find(p => p.cpf === cpfInput.value.trim());
    avisoInativo.style.display = "none";

    if (prof) {
      profissionalSelecionado = prof;
      nomeInput.value = prof.nome;
      if (prof.ativo === "INATIVO") avisoInativo.style.display = "block";
    } else {
      profissionalSelecionado = null;
      nomeInput.value = "";
    }
  });

  // =====================
  // NOME
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
          if (p.ativo === "INATIVO") avisoInativo.style.display = "block";
          listaNomes.innerHTML = "";
          listaNomes.style.display = "none";
        };
        listaNomes.appendChild(div);
      });

    listaNomes.style.display = "block";
  });

  // =====================
  // PROCEDIMENTO
  // =====================
  procedimentoInput.addEventListener("input", () => {
    listaProcedimentos.innerHTML = "";
    listaProcedimentos.style.display = "none";

    const termo = procedimentoInput.value.toLowerCase();
    if (termo.length < 2) return;

    procedimentos
      .filter(p => limparTexto(p.procedimento).toLowerCase().includes(termo))
      .slice(0, 10)
      .forEach(p => {
        const codigo = obterCodigo(p);
        const texto = limparTexto(p.procedimento);

        const div = document.createElement("div");
        div.textContent = `${codigo} - ${texto}`;
        div.onclick = () => {
          procedimentoSelecionado = p;
          procedimentoInput.value = `${codigo} - ${texto}`;

          if (texto.toUpperCase().startsWith("GRUPO")) {
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
  // SUBMIT → GOOGLE SHEETS
  // =====================
  document.getElementById("formEscala").addEventListener("submit", async e => {
    e.preventDefault();

    if (!profissionalSelecionado || !procedimentoSelecionado) {
      alert("Preencha todos os campos.");
      return;
    }

    const payload = {
      cpf: profissionalSelecionado.cpf,
      profissional: profissionalSelecionado.nome,
      cod_procedimento: obterCodigo(procedimentoSelecionado),
      procedimento: limparTexto(procedimentoSelecionado.procedimento),
      exames: examesInput.value,
      dias_semana: diasInput.value,
      hora_inicio: horaInicioInput.value,
      hora_fim: horaFimInput.value,
      vagas: vagasInput.value,
      vigencia_inicio: vigInicioInput.value,
      vigencia_fim: vigFimInput.value,
      unidade: UNIDADE_ATUAL
    };

    try {
      const resp = await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await resp.json();

      if (result.status !== "OK") {
        alert("Erro ao enviar ao Sheets: " + result.status);
      }

    } catch (err) {
      alert("Falha de conexão com o Google Sheets.");
    }

    // mantém comportamento atual
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${payload.cpf}</td>
      <td>${payload.profissional}</td>
      <td>${payload.cod_procedimento} - ${payload.procedimento}</td>
      <td>${payload.exames}</td>
      <td>${payload.dias_semana}</td>
      <td>${payload.hora_inicio}</td>
      <td>${payload.hora_fim}</td>
      <td>${payload.vagas}</td>
      <td>${payload.vigencia_inicio}</td>
      <td>${payload.vigencia_fim}</td>
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
