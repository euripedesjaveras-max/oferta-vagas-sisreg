/* ============================================================
   DASHBOARD SISREG – FASE 2
   Camada Unificada de Dados
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // ============================================================
  // CONFIGURAÇÕES GERAIS
  // ============================================================
  const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
  const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
  const CACHE_KEY = `cache_${UNIDADE}`;

  document.getElementById("txtUnidade").textContent = UNIDADE;

  // ============================================================
  // ESTADO GLOBAL DO DASHBOARD
  // ============================================================
  let dadosOriginais = [];
  let dadosFiltrados = [];

  let estadoFiltros = {
    mes: "todos"
  };

  // ============================================================
  // UTILITÁRIOS DE NORMALIZAÇÃO
  // ============================================================
  function normalizarRegistro(item) {
    const d = {};
    for (let k in item) {
      d[k.toLowerCase().trim()] = item[k];
    }
    return d;
  }

  function obterMesISO(dataISO) {
    if (!dataISO || typeof dataISO !== "string") return "";
    return dataISO.split("-")[1] || "";
  }

  function formatarHora(valor) {
    if (!valor) return "";
    if (typeof valor === "string" && valor.includes("T")) {
      return valor.split("T")[1].substring(0, 5);
    }
    return valor;
  }

  function formatarDataBR(valor) {
    if (!valor || typeof valor !== "string") return valor;
    if (valor.includes("T")) {
      return valor.split("T")[0].split("-").reverse().join("/");
    }
    return valor;
  }

  // ============================================================
  // CAMADA CENTRAL DE FILTROS
  // ============================================================
  function aplicarFiltros() {
    dadosFiltrados = dadosOriginais.filter(d => {
      if (estadoFiltros.mes === "todos") return true;
      return obterMesISO(d.vigencia_inicio) === estadoFiltros.mes;
    });

    atualizarDashboard();
  }

  // ============================================================
  // ATUALIZAÇÃO GLOBAL DO DASHBOARD
  // ============================================================
  function atualizarDashboard() {
    atualizarKPIs(dadosFiltrados);
    renderizarTabela(dadosFiltrados);
    // 👉 gráficos e insights entram aqui na FASE 3
  }

  // ============================================================
  // KPIs GERENCIAIS
  // ============================================================
  function atualizarKPIs(lista) {
    const elVagas = document.getElementById("kpiVagas");
    const elProf = document.getElementById("kpiProfissionais");
    const elRetorno = document.getElementById("kpiRetorno");
    const elProc = document.getElementById("kpiProcedimentos");
    const elLider = document.getElementById("kpiLider");

    if (!lista || lista.length === 0) {
      elVagas.textContent = "0";
      elProf.textContent = "0";
      elRetorno.textContent = "0%";
      elProc.textContent = "0";
      elLider.textContent = "-";
      return;
    }

    let totalVagas = 0;
    let vagasRetorno = 0;
    const profs = new Set();
    const procs = {};
    const procsUnicos = new Set();

    lista.forEach(d => {
      const vagas = Number(d.vagas) || 0;
      totalVagas += vagas;

      if (d.cpf) profs.add(d.cpf);

      if (d.procedimento) {
        const p = d.procedimento.trim();
        procs[p] = (procs[p] || 0) + vagas;
        procsUnicos.add(p);
      }

      const procTxt = String(d.procedimento || "").toUpperCase();
      const exTxt = String(d.exames || "").toUpperCase();
      if (procTxt.includes("RETORNO") || exTxt.includes("RETORNO")) {
        vagasRetorno += vagas;
      }
    });

    const lider = Object.keys(procs).reduce((a, b) =>
      procs[a] > procs[b] ? a : b, "-"
    );

    elVagas.textContent = totalVagas;
    elProf.textContent = profs.size;
    elProc.textContent = procsUnicos.size;
    elRetorno.textContent = totalVagas ? Math.round((vagasRetorno / totalVagas) * 100) + "%" : "0%";
    elLider.textContent = lider;
  }

  // ============================================================
  // TABELA (USADA APENAS QUANDO EXIBIDA)
  // ============================================================
  function renderizarTabela(lista) {
    const tbody = document.getElementById("corpoTabela");
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = "<tr><td colspan='11' style='text-align:center'>Nenhum dado.</td></tr>";
      return;
    }

    tbody.innerHTML = lista.map(d => `
      <tr>
        <td>${d.cpf || ""}</td>
        <td><strong>${d.profissional || ""}</strong></td>
        <td>${d.cod_procedimento || ""}</td>
        <td>${d.procedimento || ""}</td>
        <td>${d.exames || ""}</td>
        <td>${d.dias_semana || ""}</td>
        <td>${formatarHora(d.hora_inicio)}</td>
        <td>${formatarHora(d.hora_fim)}</td>
        <td>${d.vagas || 0}</td>
        <td>${formatarDataBR(d.vigencia_inicio)}</td>
        <td>${formatarDataBR(d.vigencia_fim)}</td>
      </tr>
    `).join("");
  }

  // ============================================================
  // EVENTOS DE FILTRO
  // ============================================================
  document.getElementById("filtroMes").addEventListener("change", e => {
    estadoFiltros.mes = e.target.value;
    aplicarFiltros();
  });

  // ============================================================
  // SINCRONIZAÇÃO COM SHEETS
  // ============================================================
  document.getElementById("btnSincronizar").onclick = async function () {
    this.disabled = true;
    this.textContent = "⌛ Sincronizando...";

    try {
      const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
      const res = await resp.json();

      if (res.status === "OK") {
        dadosOriginais = res.dados.map(normalizarRegistro);
        localStorage.setItem(CACHE_KEY, JSON.stringify(dadosOriginais));
        aplicarFiltros();
        alert("Dados sincronizados com sucesso!");
      }
    } catch {
      alert("Erro de comunicação com o servidor.");
    } finally {
      this.disabled = false;
      this.textContent = "🔄 Sincronizar";
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  document.getElementById("btnLogout").onclick = () => {
    localStorage.clear();
    window.location.href = "index.html";
  };

  // ============================================================
  // INICIALIZAÇÃO (CACHE LOCAL)
  // ============================================================
  const cache = localStorage.getItem(CACHE_KEY);
  if (cache) {
    dadosOriginais = JSON.parse(cache).map(normalizarRegistro);
    aplicarFiltros();
  }
});
