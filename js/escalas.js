// js/escalas.js
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

  // Carregar dados da tabela salvos localmente ao abrir a página
  carregarTabelaLocal();

  // ===== CAMPOS (IDs conforme escalahtml.txt) =====
  const form = document.getElementById("formEscala");
  const tbody = document.querySelector("#tabelaEscalas tbody");
  const cpfInput = document.getElementById("cpfInput");
  const nomeInput = document.getElementById("nomeInput");
  const procedimentoInput = document.getElementById("procedimentoInput");
  const examesInput = document.getElementById("examesInput");
  const diasInput = document.getElementById("dias");
  const horaInicioInput = document.getElementById("horaInicio");
  const horaFimInput = document.getElementById("horaFim");
  const vagasInput = document.getElementById("vagas");
  const vigInicioInput = document.getElementById("vigenciaInicio");
  const vigFimInput = document.getElementById("vigenciaFim");

  // =====================
  // CARREGAR JSONs LOCAIS
  // =====================
  fetch("data/profissionais.json").then(r => r.json()).then(d => profissionais = d);
  fetch("data/procedimentos_exames.json").then(r => r.json()).then(d => procedimentos = d);

  // =====================
  // PERSISTÊNCIA LOCAL
  // =====================

  function salvarNoCacheLocal(escala) {
    let escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    escalas.push(escala);
    localStorage.setItem("escalas_salvas", JSON.stringify(escalas));
  }

  function carregarTabelaLocal() {
    const escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    tbody.innerHTML = ""; // Limpa antes de renderizar
    escalas.forEach((item, index) => adicionarLinhaTabela(item, index));
  }

  function removerDoCacheLocal(index) {
    let escalas = JSON.parse(localStorage.getItem("escalas_salvas") || "[]");
    escalas.splice(index, 1);
    localStorage.setItem("escalas_salvas", JSON.stringify(escalas));
    carregarTabelaLocal();
  }

  function adicionarLinhaTabela(dados, index) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dados.cpf}</td>
      <td>${dados.profissional}</td>
      <td>${dados.procedimento}</td>
      <td>${dados.exames || "-"}</td>
      <td>${dados.dias_semana}</td>
      <td>${dados.hora_inicio}</td>
      <td>${dados.hora_fim}</td>
      <td>${dados.vagas}</td>
      <td>${dados.vigencia_inicio}</td>
      <td>${dados.vigencia_fim}</td>
      <td><button class="btn-delete" data-index="${index}">X</button></td>
    `;
    
    tr.querySelector(".btn-delete").onclick = () => removerDoCacheLocal(index);
    tbody.appendChild(tr);
  }

  // =====================
  // SUBMIT E INTEGRAÇÃO
  // =====================
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      cpf: cpfInput.value,
      profissional: nomeInput.value,
      cod_procedimento: procedimentoInput.value.split(" - ")[0],
      procedimento: procedimentoInput.value,
      exames: examesInput.value,
      dias_semana: diasInput.value,
      hora_inicio: horaInicioInput.value,
      hora_fim: horaFimInput.value,
      vagas: vagasInput.value,
      vigencia_inicio: vigInicioInput.value,
      vigencia_fim: vigFimInput.value,
      unidade: UNIDADE_ATUAL
    };

    // 1. Salva Localmente Primeiro (Segurança)
    salvarNoCacheLocal(payload);
    carregarTabelaLocal();

    // 2. Tenta enviar para o Sheets
    try {
      const resp = await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const result = await resp.json();
      if (result.status === "OK") {
        console.log("Sincronizado com Sheets");
      } else {
        alert("Salvo apenas localmente. Erro no servidor: " + result.mensagem);
      }
    } catch (err) {
      alert("Sem conexão. A escala foi salva apenas neste computador e será mantida na tabela.");
    }

    form.reset();
    examesInput.disabled = true;
  });
});
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
      alert("Selecione um profissional e um procedimento das listas.");
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
      // Usando o modo 'cors' ou 'no-cors' dependendo da sua necessidade. 
      // Com o cabeçalho Access-Control-Allow-Origin no backend, 'cors' é o ideal.
      const resp = await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "cors", 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const result = await resp.json();

      if (result.status === "OK") {
        alert("Sucesso: " + result.mensagem);
        
        // Adiciona na tabela visual apenas se salvou no Sheets
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

        // Limpa o formulário
        e.target.reset();
        examesInput.disabled = true;
        profissionalSelecionado = null;
        procedimentoSelecionado = null;
        avisoInativo.style.display = "none";

      } else {
        alert("Erro no servidor: " + result.status + (result.mensagem ? " - " + result.mensagem : ""));
      }

    } catch (err) {
      console.error(err);
      alert("Erro de comunicação: A escala pode não ter sido salva.");
    }
  });

});
