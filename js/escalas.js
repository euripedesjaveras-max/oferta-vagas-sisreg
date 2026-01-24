// js/escalas.js
// Integração com Google Sheets (ETAPA 1)

document.addEventListener("DOMContentLoaded", () => {

  // =====================
  // CONFIGURAÇÕES
  // =====================
  const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzfKcOuEasj4lfWzqbP1FOoSKzJdQvVM7xK81PKCBKs8LgHjp5aJTYyRIygM9n1p_-AMQ/exec";
  const UNIDADE_ATUAL = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE"; 

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
  // LÓGICA DE PERSISTÊNCIA E SINCRONIZAÇÃO
  // =====================
  
  function salvarLocalmente(dados) {
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    if (dados.status_envio === undefined) dados.status_envio = "aguardando"; 
    escalas.push(dados);
    localStorage.setItem("escalas_salvas", JSON.stringify(escalas));
  }

  function carregarTabela() {
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    tabelaBody.innerHTML = ""; 

    escalas.forEach((payload, index) => {
      const tr = document.createElement("tr");
      
      // Definição do Ícone de Nuvem por Status
      let iconeNuvem = "";
      if (payload.status_envio === "sucesso") {
        iconeNuvem = '<span title="Enviado com sucesso" style="color: #4CAF50; font-size: 1.2em;">☁️</span>'; // Verde (Emoji padrão varia, mas aqui indicamos pela lógica)
      } else if (payload.status_envio === "erro") {
        iconeNuvem = '<span title="Erro ao enviar" style="color: #f44336; font-size: 1.2em;">☁️❗</span>'; // Vermelho
      } else {
        iconeNuvem = '<span title="Aguardando sincronização" style="color: #ffc107; font-size: 1.2em;">☁️⏳</span>'; // Amarelo
      }

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
        <td style="display: flex; align-items: center; gap: 8px; justify-content: center;">
           ${iconeNuvem}
           <button class="btn-excluir" data-index="${index}" style="background:none; border:none; cursor:pointer; color:red;">X</button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });

    // Evento Excluir
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

  // Função isolada para enviar ao Google Sheets
  async function enviarParaSheets(dados) {
    try {
      await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(dados)
      });
      return true; 
    } catch (err) {
      console.error("Erro no envio:", err);
      return false;
    }
  }

  // Botão Sincronizar Tudo
  const btnSyncTudo = document.createElement("button");
  btnSyncTudo.textContent = "Sincronizar Pendentes";
  btnSyncTudo.style.margin = "10px 0";
  btnSyncTudo.style.padding = "8px 15px";
  btnSyncTudo.style.cursor = "pointer";
  btnSyncTudo.onclick = async () => {
    const atual = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    btnSyncTudo.textContent = "Sincronizando...";
    btnSyncTudo.disabled = true;

    for (let item of atual) {
      if (item.status_envio !== "sucesso") {
        const sucesso = await enviarParaSheets(item);
        item.status_envio = sucesso ? "sucesso" : "erro";
      }
    }

    localStorage.setItem("escalas_salvas", JSON.stringify(atual));
    carregarTabela();
    btnSyncTudo.textContent = "Sincronizar Pendentes";
    btnSyncTudo.disabled = false;
  };

  // Inserir o botão de sincronização acima da tabela
  const tabelaSecao = document.querySelector("#tabelaEscalas").parentNode;
  tabelaSecao.insertBefore(btnSyncTudo, document.querySelector("#tabelaEscalas"));

  carregarTabela();

  // =====================
  // UTIL (MANTIDO)
  // =====================
  function limparTexto(txt) {
    if (!txt) return "";
    return txt.replace(/"/g, "").trim();
  }

  function obterCodigo(p) {
    return p.cod_int || p["cod int"] || "";
  }

  // =====================
  // LOAD DOS DADOS (MANTIDO)
  // =====================
  fetch("data/profissionais.json").then(r => r.json()).then(d => profissionais = d);
  fetch("data/procedimentos_exames.json").then(r => r.json()).then(d => procedimentos = d);

  // =====================
  // CPF (MANTIDO)
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
  // NOME (MANTIDO)
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
  // PROCEDIMENTO (MANTIDO)
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
      unidade: UNIDADE_ATUAL,
      status_envio: "aguardando" 
    };

    // Tenta enviar imediatamente
    const sucesso = await enviarParaSheets(payload);
    payload.status_envio = sucesso ? "sucesso" : "erro";

    // Salva localmente com o status atualizado
    salvarLocalmente(payload);
    carregarTabela();

    e.target.reset();
    examesInput.disabled = true;
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
  });

});
