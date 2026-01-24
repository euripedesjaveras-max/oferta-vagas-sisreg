// js/escalas.js
// Integração com Google Sheets (ETAPA 1)

document.addEventListener("DOMContentLoaded", () => {

  // =====================
  // CONFIGURAÇÕES
  // =====================
  // URL ATUALIZADA CONFORME FORNECIDO
  const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzfKcOuEasj4lfWzqbP1FOoSKzJdQvVM7xK81PKCBKs8LgHjp5aJTYyRIygM9n1p_-AMQ/exec";
  const UNIDADE_ATUAL = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE"; // Mantém unidade dinâmica

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
  // LÓGICA DE PERSISTÊNCIA LOCAL (NOVO)
  // =====================
  function salvarLocalmente(dados) {
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    escalas.push(dados);
    localStorage.setItem("escalas_salvas", JSON.stringify(escalas));
  }

  function carregarTabela() {
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    tabelaBody.innerHTML = ""; // Limpa para reconstruir

    escalas.forEach((payload, index) => {
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
        <td><button class="btn-excluir" data-index="${index}">X</button></td>
      `;
      tabelaBody.appendChild(tr);
    });

    // Evento para o botão excluir
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.onclick = (e) => {
        const idx = e.target.getAttribute("data-index");
        const atual = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
        atual.splice(idx, 1);
        localStorage.setItem("escalas_salvas", JSON.stringify(atual));
        carregarTabela();
      };
    });
  }

  // Inicializa a tabela ao carregar
  carregarTabela();

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
  // SUBMIT
  // =====================
  document.getElementById("formEscala").addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      cpf: cpfInput.value,
      profissional: nomeInput.value,
      cod_procedimento: procedimentoSelecionado ? obterCodigo(procedimentoSelecionado) : (procedimentoInput.value.split(" - ")[0] || ""),
      procedimento: procedimentoSelecionado ? limparTexto(procedimentoSelecionado.procedimento) : (procedimentoInput.value.split(" - ")[1] || procedimentoInput.value),
      exames: examesInput.value,
      dias_semana: diasInput.value,
      hora_inicio: horaInicioInput.value,
      hora_fim: horaFimInput.value,
      vagas: vagasInput.value,
      vigencia_inicio: vigInicioInput.value,
      vigencia_fim: vigFimInput.value,
      unidade: UNIDADE_ATUAL
    };

    // Salva localmente e atualiza a tabela imediatamente
    salvarLocalmente(payload);
    carregarTabela();

    try {
      // AJUSTE CRÍTICO: Enviando como texto plano para evitar bloqueio de CORS do Google
      const resp = await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "no-cors", // Evita o erro de pre-flight do Google
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });

      // Nota: Com 'no-cors' o navegador não permite ler resp.json(), 
      // mas o dado chega com sucesso na planilha.
      console.log("Dados enviados ao processo do Sheets.");

    } catch (err) {
      console.error("Erro de conexão:", err);
      alert("Falha de conexão com o Google Sheets. A escala ficou salva localmente na tabela.");
    }

    // Limpa o formulário mantendo a tabela preenchida
    e.target.reset();
    examesInput.disabled = true;
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
  });

});
