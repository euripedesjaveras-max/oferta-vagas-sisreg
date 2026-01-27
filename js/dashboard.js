/* [LOGICA] Inicializacao e Variaveis de Ambiente */
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const CACHE_KEY = `cache_${UNIDADE}`;

    document.getElementById("txtUnidade").textContent = UNIDADE;

    /* [LOGICA] Carregar Creditos do config.json */
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema} | ${c.desenvolvedor}</p>`;
    }).catch(() => {});

    /* [LOGICA] Funcoes de Formatacao de Dados */
    function formatarHora(valor) {
        if (!valor) return '';
        if (typeof valor === "string" && valor.includes('T')) return valor.split('T')[1].substring(0, 5);
        return valor;
    }

    function formatarDataBR(valor) {
        if (!valor || typeof valor !== "string") return valor;
        if (valor.includes('T')) {
            const dataPura = valor.split('T')[0];
            return dataPura.split('-').reverse().join('/');
        }
        return valor;
    }

    /* [LOGICA] Funcao para Atualizar os Cards (KPIs) - CORRECAO % RETORNO */
    function atualizarCards(dadosFiltrados) {
        const kpiVagas = document.getElementById("kpiVagas");
        const kpiProfs = document.getElementById("kpiProfissionais");
        const kpiMedia = document.getElementById("kpiMedia");
        const kpiLider = document.getElementById("kpiLider");
        const kpiRetorno = document.getElementById("kpiRetorno");
        const kpiProcedimentos = document.getElementById("kpiProcedimentos");

        if (!dadosFiltrados || dadosFiltrados.length === 0) {
            if(kpiVagas) kpiVagas.textContent = "0";
            if(kpiProfs) kpiProfs.textContent = "0";
            if(kpiMedia) kpiMedia.textContent = "0";
            if(kpiLider) kpiLider.textContent = "-";
            if(kpiRetorno) kpiRetorno.textContent = "0%";
            if(kpiProcedimentos) kpiProcedimentos.textContent = "0";
            return;
        }

        let totalVagas = 0;
        let vagasRetorno = 0;
        const cpfs = new Set();
        const procsUnicos = new Set();
        const contagemProcs = {};

        dadosFiltrados.forEach(item => {
            // Normalização das chaves para garantir leitura
            const d = {};
            for (let k in item) { 
                d[k.toLowerCase().trim()] = item[k]; 
            }

            // Soma de Vagas
            const qtdVagas = Number(d.vagas) || 0;
            totalVagas += qtdVagas;
            
            // BUSCA DE RETORNO (Mais abrangente)
            // Transforma tudo em String, remove espaços extras e busca a palavra
            const campoProc = String(d.procedimento || "").toUpperCase().trim();
            const campoExame = String(d.exames || "").toUpperCase().trim();
            
            if (campoProc.toUpperCase().includes("RETORNO") ||
                campoExame.toUpperCase().includes("RETORNO")
            ) {
              vagasRetorno += qtdVagas;
            }

            if (d.cpf) cpfs.add(d.cpf);
            if (d.procedimento) {
                procsUnicos.add(d.procedimento.trim());
                contagemProcs[d.procedimento.trim()] = (contagemProcs[d.procedimento.trim()] || 0) + 1;
            }
        });

        // Cálculos
        const nProfs = cpfs.size;
        const nProcs = procsUnicos.size;
        const media = nProfs > 0 ? (totalVagas / nProfs).toFixed(1) : 0;
        
        // % de Retorno arredondado
        const percRetorno = totalVagas > 0 ? Math.round((vagasRetorno / totalVagas) * 100) : 0;

        // Encontrar o Líder
        let liderNome = "-";
        const chaves = Object.keys(contagemProcs);
        if (chaves.length > 0) {
            liderNome = chaves.reduce((a, b) => contagemProcs[a] > contagemProcs[b] ? a : b);
        }

        // Atualização da UI
        if(kpiVagas) kpiVagas.textContent = totalVagas;
        if(kpiProfs) kpiProfs.textContent = nProfs;
        if(kpiMedia) kpiMedia.textContent = media;
        if(kpiProcedimentos) kpiProcedimentos.textContent = nProcs;
        if(kpiLider) kpiLider.textContent = liderNome;
        if(kpiRetorno) kpiRetorno.textContent = percRetorno + "%";
    }

    /* =====================================================================
       [FASE 2] CONTROLE DE VISUALIZACAO (UX)
       >>> NENHUMA FUNCAO EXISTENTE FOI ALTERADA <<<
       ===================================================================== */

    // [FASE 2] Toggle da tabela (Dashboard primeiro, tabela opcional)
    const btnToggleTabela = document.getElementById("btnToggleTabela");
    const secTabela = document.getElementById("secTabela");

    if (btnToggleTabela && secTabela) {
        btnToggleTabela.onclick = () => {
            const visivel = secTabela.style.display === "block";
            secTabela.style.display = visivel ? "none" : "block";
            btnToggleTabela.textContent = visivel ? "📋 Ver Tabela" : "📊 Ocultar Tabela";
        };
    }

    /* =====================================================================
       [FASE 3] NOVA CAMADA DE GRAFICOS E INSIGHTS
       >>> NENHUMA FUNCAO EXISTENTE FOI ALTERADA <<<
       ===================================================================== */

    let charts = {}; // [FASE 3] Armazena instancias para evitar sobreposicao

    /* [FASE 3] Funcao principal para atualizar TODOS os graficos */
    function atualizarGraficos(dados) {
        gerarHeatmap(dados);
        gerarFunil(dados);
        gerarRadar(dados);
        gerarBolhas(dados);
        gerarDonut(dados);
        gerarLinhaVigencia(dados);
        gerarInsights(dados);
    }

    /* [FASE 3] Heatmap Dia x Horario (implementacao custom com bubble) */
    function gerarHeatmap(dados) {
        if (charts.heatmap) charts.heatmap.destroy();

        const dias = ["SEG","TER","QUA","QUI","SEX"];
        const pontos = [];

        dados.forEach(d => {
            const diasSemana = String(d.dias_semana || "");
            dias.forEach((dia, idx) => {
                if (diasSemana.includes(dia)) {
                    const h = parseInt(formatarHora(d.hora_inicio)?.split(":")[0] || 0);
                    pontos.push({ x: idx, y: h, r: Math.max(4, Number(d.vagas || 1)) });
                }
            });
        });

        charts.heatmap = new Chart(document.getElementById("chartHeatmap"), {
            type: "bubble",
            data: { datasets: [{ data: pontos, backgroundColor: "#fdbb2d" }] },
            options: {
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { callback: v => dias[v] } },
                    y: { title: { display: true, text: "Hora" } }
                }
            }
        });
    }

    /* [FASE 3] Funil de Oferta */
    function gerarFunil(dados) {
        if (charts.funil) charts.funil.destroy();

        const total = dados.length;
        const profs = new Set(dados.map(d => d.cpf)).size;
        const procs = new Set(dados.map(d => d.procedimento)).size;

        charts.funil = new Chart(document.getElementById("chartFunil"), {
            type: "bar",
            data: {
                labels: ["Escalas", "Profissionais", "Procedimentos"],
                datasets: [{
                    data: [total, profs, procs],
                    backgroundColor: ["#1a2a6c","#4CAF50","#fdbb2d"]
                }]
            },
            options: { indexAxis: "y", plugins: { legend: { display: false } } }
        });
    }

    /* [FASE 3] Radar de Perfil */
    function gerarRadar(dados) {
        if (charts.radar) charts.radar.destroy();

        const mapa = {};
        dados.forEach(d => {
            const p = d.procedimento || "OUTROS";
            mapa[p] = (mapa[p] || 0) + Number(d.vagas || 0);
        });

        charts.radar = new Chart(document.getElementById("chartRadar"), {
            type: "radar",
            data: {
                labels: Object.keys(mapa),
                datasets: [{
                    data: Object.values(mapa),
                    backgroundColor: "rgba(26,42,108,0.3)",
                    borderColor: "#1a2a6c"
                }]
            }
        });
    }

    /* [FASE 3] Bubble de Profissionais */
    function gerarBolhas(dados) {
        if (charts.bolhas) charts.bolhas.destroy();

        const mapa = {};
        dados.forEach(d => {
            mapa[d.profissional] = (mapa[d.profissional] || 0) + Number(d.vagas || 0);
        });

        const bubbles = Object.keys(mapa).map((p, i) => ({
            x: i, y: mapa[p], r: Math.max(5, mapa[p] / 2)
        }));

        charts.bolhas = new Chart(document.getElementById("chartBolhas"), {
            type: "bubble",
            data: { datasets: [{ data: bubbles, backgroundColor: "#4CAF50" }] },
            options: { plugins: { legend: { display: false } } }
        });
    }

    /* [FASE 3] Donut de Distribuicao */
    function gerarDonut(dados) {
        if (charts.donut) charts.donut.destroy();

        const mapa = {};
        dados.forEach(d => {
            mapa[d.dias_semana] = (mapa[d.dias_semana] || 0) + Number(d.vagas || 0);
        });

        charts.donut = new Chart(document.getElementById("chartDonut"), {
            type: "doughnut",
            data: {
                labels: Object.keys(mapa),
                datasets: [{ data: Object.values(mapa) }]
            }
        });
    }

    /* [FASE 3] Linha de Vigencia */
    function gerarLinhaVigencia(dados) {
        if (charts.linha) charts.linha.destroy();

        const mapa = {};
        dados.forEach(d => {
            mapa[d.vigencia_inicio] = (mapa[d.vigencia_inicio] || 0) + Number(d.vagas || 0);
        });

        charts.linha = new Chart(document.getElementById("chartLinha"), {
            type: "line",
            data: {
                labels: Object.keys(mapa),
                datasets: [{ data: Object.values(mapa), borderColor: "#b21f1f" }]
            }
        });
    }

    /* [FASE 3] Insights Narrativos */
    function gerarInsights(dados) {
        const ul = document.getElementById("listaInsights");
        if (!ul) return;

        ul.innerHTML = "";
        if (!dados || dados.length === 0) return;

        const total = dados.reduce((s,d)=>s+Number(d.vagas||0),0);
        ul.innerHTML += `<li>Total de <strong>${total}</strong> vagas ofertadas.</li>`;
    }
   
    /* [LOGICA] Funcao de Filtro Mensal */
    function filtrarTabela() {
        const mesSelecionado = document.getElementById("filtroMes").value;
        const linhas = document.querySelectorAll("#corpoTabela tr");
        let dadosParaKPI = [];

        // Recuperar dados do cache para recalcular os cards baseado no que esta visivel
        const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");

        linhas.forEach((linha, index) => {
            const dataVigencia = linha.getAttribute("data-mes");
            if (mesSelecionado === "todos" || dataVigencia === mesSelecionado) {
                linha.style.display = ""; 
                if(cache[index]) dadosParaKPI.push(cache[index]);
            } else {
                linha.style.display = "none"; 
            }
        });

        // Se filtrar, os cards mostram apenas o resumo do mes selecionado
        atualizarCards(dadosParaKPI);
        atualizarGraficos(dadosParaKPI); // [FASE 3] CHAMADA NOVA
    }

    /* [LOGICA] Funcao para Gerar o HTML da Tabela Dinamicamente */
    function renderizarDados(dados) {
        const tbody = document.getElementById("corpoTabela");
        if (!tbody) return;
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px;'>Nenhum dado encontrado.</td></tr>";
            return;
        }

        tbody.innerHTML = dados.map(item => {
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            // Extração do mês para o filtro (assume formato ISO do Sheets YYYY-MM-DD)
            const mesISO = d.vigencia_inicio ? d.vigencia_inicio.split('-')[1] : "";

            return `
                <tr data-mes="${mesISO}">
                    <td>${d.cpf || ''}</td>
                    <td><strong>${d.profissional || ''}</strong></td>
                    <td>${d.cod_procedimento || ''}</td>
                    <td>${d.procedimento || ''}</td>
                    <td>${d.exames || ''}</td>
                    <td>${d.dias_semana || ''}</td>
                    <td>${formatarHora(d.hora_inicio)}</td>
                    <td>${formatarHora(d.hora_fim)}</td>
                    <td>${d.vagas || 0}</td>
                    <td>${formatarDataBR(d.vigencia_inicio)}</td>
                    <td>${formatarDataBR(d.vigencia_fim)}</td>
                </tr>
            `;
        }).join('');
        
        // Aplica o filtro atual logo após renderizar (caso o usuário já tenha selecionado um mês)
        atualizarCards(dados); // Atualiza os cards com o total geral no carregamento
        filtrarTabela(); // Aplica o filtro (e atualiza os cards conforme o filtro)
    }

    /* [LOGICA] Eventos de Interação */
    document.getElementById("filtroMes").addEventListener("change", filtrarTabela);

    document.getElementById("btnSincronizar").onclick = async function() {
        this.innerHTML = "⌛ Sincronizando...";
        this.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();

            if (res.status === "OK") {
                localStorage.setItem(CACHE_KEY, JSON.stringify(res.dados));
                renderizarDados(res.dados);
                alert("Sincronizado!");
            }
        } catch (e) {
            alert("Erro de conexão.");
        } finally {
            this.innerHTML = "🔄 Sincronizar";
            this.disabled = false;
        }
    };

    /* [LOGICA] Controle de Logout */
    document.getElementById("btnLogout").onclick = () => {
        window.location.href = "index.html";
    };

    /* [INICIALIZACAO] Carregar Cache Local */
    const dadosSalvos = localStorage.getItem(CACHE_KEY);
    if (dadosSalvos) {
       const dados = JSON.parse(dadosSalvos);
        renderizarDados(dados);
        atualizarGraficos(dados); // [FASE 3] CHAMADA NOVA
    }
});

