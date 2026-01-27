/* [LOGICA] Inicializacao e Variaveis de Ambiente */
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const CACHE_KEY = `cache_${UNIDADE}`;

    document.getElementById("txtUnidade").textContent = UNIDADE;

    /* [LOGICA] Carregar Creditos */
    fetch("data/config.json")
        .then(r => r.json())
        .then(c => {
            const f = document.getElementById("footerCreditos");
            if (f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema} | ${c.desenvolvedor}</p>`;
        }).catch(() => {});

    /* ================= UTILITARIOS ================= */
    function formatarHora(valor) {
        if (!valor) return '';
        if (typeof valor === "string" && valor.includes('T'))
            return valor.split('T')[1].substring(0, 5);
        return valor;
    }

    function formatarDataBR(valor) {
        if (!valor || typeof valor !== "string") return valor;
        if (valor.includes('T')) {
            const d = valor.split('T')[0];
            return d.split('-').reverse().join('/');
        }
        return valor;
    }

    /* ================= KPIs ================= */
    function atualizarCards(dados) {
        const kpiVagas = document.getElementById("kpiVagas");
        const kpiProfs = document.getElementById("kpiProfissionais");
        const kpiLider = document.getElementById("kpiLider");
        const kpiRetorno = document.getElementById("kpiRetorno");
        const kpiProcedimentos = document.getElementById("kpiProcedimentos");

        if (!dados || dados.length === 0) {
            kpiVagas.textContent = "0";
            kpiProfs.textContent = "0";
            kpiLider.textContent = "-";
            kpiRetorno.textContent = "0%";
            kpiProcedimentos.textContent = "0";
            return;
        }

        let totalVagas = 0;
        let vagasRetorno = 0;
        const profs = new Set();
        const procs = {};
        const procUnicos = new Set();

        dados.forEach(item => {
            const d = {};
            for (let k in item) d[k.toLowerCase()] = item[k];

            const vagas = Number(d.vagas || 0);
            totalVagas += vagas;

            const proc = String(d.procedimento || "").toUpperCase();
            const exam = String(d.exames || "").toUpperCase();
            if (proc.includes("RETORNO") || exam.includes("RETORNO"))
                vagasRetorno += vagas;

            if (d.cpf) profs.add(d.cpf);
            if (d.procedimento) {
                procUnicos.add(d.procedimento);
                procs[d.procedimento] = (procs[d.procedimento] || 0) + 1;
            }
        });

        const lider = Object.keys(procs).reduce((a, b) => procs[a] > procs[b] ? a : b, "-");
        const percRetorno = totalVagas ? Math.round((vagasRetorno / totalVagas) * 100) : 0;

        kpiVagas.textContent = totalVagas;
        kpiProfs.textContent = profs.size;
        kpiProcedimentos.textContent = procUnicos.size;
        kpiLider.textContent = lider;
        kpiRetorno.textContent = percRetorno + "%";
    }

    /* ================= FASE 3 – GRAFICOS ================= */
    let charts = {};

    function destruir(id) {
        if (charts[id]) charts[id].destroy();
    }

    function atualizarGraficos(dados) {
        gerarHeatmap(dados);
        gerarFunil(dados);
        gerarRadar(dados);
        gerarBolhas(dados);
        gerarDonut(dados);
        gerarLinha(dados);
        gerarInsights(dados);
    }

    function gerarHeatmap(dados) {
        destruir("heatmap");
        const dias = ["SEG","TER","QUA","QUI","SEX"];
        const pontos = [];

        dados.forEach(d => {
            dias.forEach((dia, x) => {
                if ((d.dias_semana || "").includes(dia)) {
                    const h = parseInt(formatarHora(d.hora_inicio)?.split(":")[0] || 0);
                    pontos.push({ x, y: h, r: Math.max(4, Number(d.vagas || 1)) });
                }
            });
        });

        charts.heatmap = new Chart(chartHeatmap, {
            type: "bubble",
            data: { datasets: [{ data: pontos, backgroundColor: "#fdbb2d" }] },
            options: { plugins: { legend: { display: false } } }
        });
    }

    function gerarFunil(dados) {
        destruir("funil");
        charts.funil = new Chart(chartFunil, {
            type: "bar",
            data: {
                labels: ["Escalas", "Profissionais", "Procedimentos"],
                datasets: [{
                    data: [
                        dados.length,
                        new Set(dados.map(d => d.cpf)).size,
                        new Set(dados.map(d => d.procedimento)).size
                    ],
                    backgroundColor: ["#1a2a6c","#4CAF50","#fdbb2d"]
                }]
            },
            options: { indexAxis: "y", plugins: { legend: { display: false } } }
        });
    }

    function gerarRadar(dados) {
        destruir("radar");
        const mapa = {};
        dados.forEach(d => mapa[d.procedimento] = (mapa[d.procedimento] || 0) + Number(d.vagas || 0));

        charts.radar = new Chart(chartRadar, {
            type: "radar",
            data: { labels: Object.keys(mapa), datasets: [{ data: Object.values(mapa), backgroundColor: "rgba(26,42,108,.3)", borderColor: "#1a2a6c" }] }
        });
    }

    function gerarBolhas(dados) {
        destruir("bolhas");
        const mapa = {};
        dados.forEach(d => mapa[d.profissional] = (mapa[d.profissional] || 0) + Number(d.vagas || 0));

        charts.bolhas = new Chart(chartBolhas, {
            type: "bubble",
            data: { datasets: [{ data: Object.keys(mapa).map((p,i)=>({x:i,y:mapa[p],r:mapa[p]/2||5})), backgroundColor:"#4CAF50" }] },
            options:{plugins:{legend:{display:false}}}
        });
    }

    function gerarDonut(dados) {
        destruir("donut");
        const mapa = {};
        dados.forEach(d => mapa[d.dias_semana] = (mapa[d.dias_semana] || 0) + Number(d.vagas || 0));

        charts.donut = new Chart(chartDonut, {
            type: "doughnut",
            data: { labels: Object.keys(mapa), datasets: [{ data: Object.values(mapa) }] }
        });
    }

    function gerarLinha(dados) {
        destruir("linha");
        const mapa = {};
        dados.forEach(d => mapa[d.vigencia_inicio] = (mapa[d.vigencia_inicio] || 0) + Number(d.vagas || 0));

        charts.linha = new Chart(chartLinha, {
            type: "line",
            data: { labels: Object.keys(mapa), datasets: [{ data: Object.values(mapa), borderColor:"#b21f1f" }] }
        });
    }

    function gerarInsights(dados) {
        const ul = document.getElementById("listaInsights");
        ul.innerHTML = "";
        const total = dados.reduce((s,d)=>s+Number(d.vagas||0),0);
        ul.innerHTML += `<li>Total de <strong>${total}</strong> vagas ofertadas.</li>`;
    }

    /* ================= TABELA + FILTRO ================= */
    function renderizarDados(dados) {
        const tbody = document.getElementById("corpoTabela");
        tbody.innerHTML = dados.map(d => `
            <tr data-mes="${d.vigencia_inicio?.split('-')[1]}">
                <td>${d.cpf||""}</td>
                <td><strong>${d.profissional||""}</strong></td>
                <td>${d.cod_procedimento||""}</td>
                <td>${d.procedimento||""}</td>
                <td>${d.exames||""}</td>
                <td>${d.dias_semana||""}</td>
                <td>${formatarHora(d.hora_inicio)}</td>
                <td>${formatarHora(d.hora_fim)}</td>
                <td>${d.vagas||0}</td>
                <td>${formatarDataBR(d.vigencia_inicio)}</td>
                <td>${formatarDataBR(d.vigencia_fim)}</td>
            </tr>
        `).join("");

        atualizarCards(dados);
        atualizarGraficos(dados);
    }

    document.getElementById("filtroMes").addEventListener("change", () => {
        const mes = filtroMes.value;
        const dados = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
        const filtrados = mes === "todos" ? dados : dados.filter(d => d.vigencia_inicio?.includes(`-${mes}-`));
        renderizarDados(filtrados);
    });

    document.getElementById("btnSincronizar").onclick = async function() {
        const r = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}`);
        const j = await r.json();
        localStorage.setItem(CACHE_KEY, JSON.stringify(j.dados));
        renderizarDados(j.dados);
    };

    document.getElementById("btnLogout").onclick = () => location.href = "index.html";

    const cache = localStorage.getItem(CACHE_KEY);
    if (cache) renderizarDados(JSON.parse(cache));
});
