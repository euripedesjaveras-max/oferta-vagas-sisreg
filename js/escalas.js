// js/escalas.js
// Integração com Google Sheets (Versão Completa e Consolidada)

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

  // ===== CAMPOS DO FORMULÁRIO =====
  const form = document.getElementById("formEscala");
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
  // SELETOR DE COMPETÊNCIA (FILTRO)
  // =====================
  const seletorDiv = document.createElement("div");
  seletorDiv.style = "margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; display: flex; gap: 15px; align-items: center; border: 1px solid #ddd;";
  seletorDiv.innerHTML = `
    <div>
      <label style="font-weight:600; margin-right:5px;">Mês Competência:</label>
      <select id="mesComp" style="padding: 5px; border-radius: 4px;">
        <option value="0">Janeiro</option><option value="1">Fevereiro</option>
        <option value="2">Março</option><option value="3">Abril</option>
        <option value="4">Maio</option><option value="5">Junho</option>
        <option value="6">Julho</option><option value="7">Agosto</option>
        <option value="8">Setembro</option><option value="9">Outubro</option>
        <option value="10">Novembro</option><option value="11">Dezembro</option>
      </select>
    </div>
    <div>
      <label style="font-weight:600; margin-right:5px;">Ano:</label>
      <input type="number" id="anoComp" value="${new Date().getFullYear()}" style="width: 80px; padding: 5px; border-radius: 4px; border: 1px solid #ccc;">
    </div>
    <button id="btnFiltrar" style="background: #4CAF50; color: white; border: none; padding: 7px 15px; border-radius: 4px; cursor: pointer; font-weight: 500;">Consultar Nuvem</button>
  `;
  
  const tabelaSecao = document.querySelector("#tabelaEscalas").parentNode;
  tabelaSecao.insertBefore(seletorDiv, document.querySelector("#tabelaEscalas"));

  // Sincroniza o seletor com o mês atual por padrão
  document.getElementById("mesComp").value = new Date().getMonth();

  // =====================
  // LÓGICA DE SINCRONIZAÇÃO E TABELA
  // =====================

  async function carregarDadosDaNuvem() {
    const mes = document.getElementById("mesComp").value;
    const ano = document.getElementById("anoComp").value;
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    
    tabelaBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Buscando escalas vigentes em " + (parseInt(mes)+1) + "/" + ano + "...</td></tr>";

    try {
      const url = `${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE_ATUAL)}&mes=${mes}&ano=${ano}`;
      const resp = await fetch(url);
      const result = await resp.json();

      if (result.status === "OK") {
        renderizarTabela(result.dados);
      } else {
        tabelaBody.innerHTML = "<tr><td colspan='11' style='text-align:center;'>Nenhum dado encontrado para este período.</td></tr>";
      }
    } catch (err) {
      console.error("Erro na nuvem:", err);
      tabelaBody.innerHTML = "<tr><td colspan='11' style='text-align:center; color: red;'>Erro de conexão. Verifique os itens pendentes de sincronização abaixo.</td></tr>";
      carregarTabelaLocal(); 
    }
  }

  function renderizarTabela(dados) {
    const tabelaBody = document.querySelector("#tabelaEscalas tbody");
    tabelaBody.innerHTML = ""; 

    dados.forEach((payload, index) => {
      const tr = document.createElement("tr");
      
      // Ícone de Nuvem por Status
      let iconeNuvem = "";
      if (payload.status_envio === "sucesso" || payload.unidade) { // Se tem 'unidade' vindo do GET, já está no Sheets
        iconeNuvem = '<span title="Sincronizado" style="color: #4CAF50; font-size: 1.2em;">☁️</span>';
      } else if (payload.status_envio === "erro") {
        iconeNuvem = '<span title="Erro no envio" style="color: #f44336; font-size: 1.2em;">☁️❗</span>';
      } else {
        iconeNuvem = '<span title="Aguardando conexão" style="color: #ffc107; font-size: 1.2em;">☁️⏳</span>';
      }

      tr.innerHTML = `
        <td>${payload.cpf}</td>
        <td>${payload.profissional}</td>
        <td>${payload.cod_procedimento} - ${payload.procedimento}</td>
        <td>${payload.exames || "-"}</td>
        <td>${payload.dias_semana}</td>
        <td>${payload.hora_inicio}</td>
        <td>${payload.hora_fim}</td>
        <td>${payload.vagas}</td>
        <td>${payload.vigencia_inicio}</td>
        <td>${payload.vigencia_fim}</td>
        <td style="display: flex; align-items: center; gap: 10px; justify-content: center;">
           ${iconeNuvem}
           <button class="btn-excluir" data-index="${index}" style="background:none; border:none; cursor:pointer; color:#f44336; font-weight:bold;">X</button>
        </td>
      `;
      tabelaBody.appendChild(tr);
    });

    // Evento Excluir (Local)
    document.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.onclick = (e) => {
        const idx = e.target.getAttribute("data-index");
        let atual = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
        atual.splice(idx, 1);
        localStorage.setItem("escalas_salvas", JSON.stringify(atual));
        carregarDadosDaNuvem();
      };
    });
  }

  function carregarTabelaLocal() {
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    renderizarTabela(escalas);
  }

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
      return false;
    }
  }

  // =====================
  // BOTÃO SINCRONIZAR TUDO
  // =====================
  const btnSyncTudo = document.createElement("button");
  btnSyncTudo.textContent = "Sincronizar Pendentes";
  btnSyncTudo.style = "margin: 10px 0; background: #2196F3; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-weight: 600;";
  btnSyncTudo.onclick = async () => {
    const atual = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    const pendentes = atual.filter(i => i.status_envio !== "sucesso");
    
    if(pendentes.length === 0) return alert("Não há itens pendentes de sincronização.");

    btnSyncTudo.textContent = "Enviando...";
    btnSyncTudo.disabled = true;

    for (let item of pendentes) {
      const sucesso = await enviarParaSheets(item);
      item.status_envio = sucesso ? "sucesso" : "erro";
    }

    localStorage.setItem("escalas_salvas", JSON.stringify(atual));
    carregarDadosDaNuvem();
    btnSyncTudo.textContent = "Sincronizar Pendentes";
    btnSyncTudo.disabled = false;
  };
  tabelaSecao.insertBefore(btnSyncTudo, document.querySelector("#tabelaEscalas"));

  // =====================
  // UTILITÁRIOS
  // =====================
  function limparTexto(txt) {
    return txt ? txt.replace(/"/g, "").trim() : "";
  }

  function obterCodigo(p) {
    return p.cod_int || p["cod int"] || "";
  }

  // =====================
  // CARREGAMENTO DE DADOS LOCAIS (JSON)
  // =====================
  fetch("data/profissionais.json").then(r => r.json()).then(d => profissionais = d);
  fetch("data/procedimentos_exames.json").then(r => r.json()).then(d => procedimentos = d);

  // =====================
  // EVENTOS DE BUSCA (AUTOCOMPLETE)
  // =====================
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
    listaNomes.innerHTML = "";
    const termo = nomeInput.value.toLowerCase();
    if (termo.length < 2) { listaNomes.style.display = "none"; return; }
    
    profissionais.filter(p => p.nome.toLowerCase().includes(termo)).slice(0, 10).forEach(p => {
      const div = document.createElement("div");
      div.textContent = `${p.nome} (${p.cpf})`;
      div.onclick = () => {
        profissionalSelecionado = p;
        cpfInput.value = p.cpf;
        nomeInput.value = p.nome;
        avisoInativo.style.display = p.ativo === "INATIVO" ? "block" : "none";
        listaNomes.style.display = "none";
      };
      listaNomes.appendChild(div);
    });
    listaNomes.style.display = "block";
  });

  procedimentoInput.addEventListener("input", () => {
    listaProcedimentos.innerHTML = "";
    const termo = procedimentoInput.value.toLowerCase();
    if (termo.length < 2) { listaProcedimentos.style.display = "none"; return; }

    procedimentos.filter(p => limparTexto(p.procedimento).toLowerCase().includes(termo)).slice(0, 10).forEach(p => {
      const codigo = obterCodigo(p);
      const texto = limparTexto(p.procedimento);
      const div = document.createElement("div");
      div.textContent = `${codigo} - ${texto}`;
      div.onclick = () => {
        procedimentoSelecionado = p;
        procedimentoInput.value = `${codigo} - ${texto}`;
        examesInput.disabled = !texto.toUpperCase().startsWith("GRUPO");
        if (examesInput.disabled) examesInput.value = "";
        listaProcedimentos.style.display = "none";
      };
      listaProcedimentos.appendChild(div);
    });
    listaProcedimentos.style.display = "block";
  });

  // =====================
  // SUBMIT DO FORMULÁRIO
  // =====================
  form.addEventListener("submit", async e => {
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

    // Salva localmente (histórico do navegador)
    let locais = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    locais.push(payload);
    localStorage.setItem("escalas_salvas", JSON.stringify(locais));

    // Recarrega a visualização
    carregarDadosDaNuvem();

    // Reseta o formulário
    form.reset();
    examesInput.disabled = true;
    profissionalSelecionado = null;
    procedimentoSelecionado = null;
  });

  // Inicialização
  document.getElementById("btnFiltrar").onclick = carregarDadosDaNuvem;
  carregarDadosDaNuvem();
});
