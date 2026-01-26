// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    let charts = {};

    // --- CARREGAR CRÉDITOS ---
    fetch("data/config.json")
        .then(r => r.json())
        .then(c => {
            const f = document.getElementById("footerCreditos");
            if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema}</p><p>Desenvolvedor: <strong>${c.desenvolvedor}</strong> • ${c.detalhes}</p>`;
        }).catch(e => console.error("Erro créditos:", e));

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // --- SINCRONIZAR (Google Sheets -> Tabela) ---
    async function sincronizar() {
        const btn = document.getElementById("btnSincronizar");
        btn.textContent = "⌛ Sincronizando...";
        btn.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const result = await resp.json();

            if (result.status === "OK") {
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(result.dados));
                renderizarTabela(result.dados);
                popularFiltroProfissionais(result.dados);
                aplicarFiltros(); // Atualiza filtros e gráficos após carregar
                alert("Dados sincronizados!");
            }
        } catch (e) {
            alert("Erro de comunicação.");
        } finally {
            btn.textContent = "🔄 Sincronizar Sheets";
            btn.disabled = false;
        }
    }

    // --- RENDERIZAR TABELA (Modelo igual ao Sheets) ---
    function renderizarTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dados.map(d => `
            <tr class="linha-dados" 
                data-prof="${d.profissional}" 
                data-vigencia="${d.vigencia_inicio}"
                data-vagas="${d.vagas}"
                data-dias="${d.dias_semana}">
                <td>${d.cpf || ''}</td>
                <td><strong>${d.profissional}</strong></td>
                <td>${d.cod_procedimento || ''}</td>
                <td>${d.procedimento}</td>
                <td>${d.exames || ''}</td>
                <td>${d.dias_semana}</td>
                <td>${d.hora_inicio}</td>
                <td>${d.hora_fim}</td>
                <td style="font-weight:bold;">${d.vagas}</td>
                <td>${d.vigencia_inicio}</td>
                <td>${d.vigencia_fim || ''}</td>
            </tr>
        `).join('') || "<tr><td colspan='11'>Sem dados. Sincronize.</td></tr>";
    }

    // --- APLICAR FILTROS (Esconde linhas e dispara atualização de gráficos) ---
    function aplicarFiltros() {
        const mes = document.getElementById("selMes").value;
        const ano = document.getElementById("inpAno").value;
        const prof = document.getElementById("selProfissional").value;
        const linhas = document.querySelectorAll(".linha-dados");

        linhas.forEach(tr => {
            const dataV = new Date(tr.dataset.vigencia + "T00:00:00");
            const nomeProf = tr.dataset.prof;

            const matchMes = mes === "all" || dataV.getMonth() == mes;
            const matchAno = ano === "" || dataV.getFullYear() == ano;
            const matchProf = prof === "all" || nomeProf === prof;

            tr.style.display = (matchMes && matchAno && matchProf) ? "" : "none";
        });

        // Após filtrar a tabela, os gráficos leem apenas o que sobrou
        atualizarGraficosPelaTabela();
    }

    // --- GRÁFICOS LENDO A TABELA LOCAL (Somente linhas visíveis) ---
    function atualizarGraficosPelaTabela() {
        const visiveis = Array.from(document.querySelectorAll(".linha-dados")).filter(tr => tr.style.display !== "none");
        
        let totalVagas = 0;
        let listaProcs = new Set();
        let listaProfs = new Set();
        let profMap = {};
        let diasMap = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0 };

        visiveis.forEach(tr => {
            const vagas = parseInt(tr.dataset.vagas) || 0;
            const nome = tr.dataset.prof;
            const dias = tr.dataset.dias;
            const proc = tr.cells[3].textContent; // Coluna Procedimento

            totalVagas += vagas;
            listaProfs.add(nome);
            listaProcs.add(proc);
            profMap[nome] = (profMap[nome] || 0) + vagas;

            ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].forEach(d => {
                if(dias.includes(d)) diasMap[d] += vagas;
            });
        });

        // Atualiza KPIs
        document.getElementById("kpiVagas").textContent = totalVagas;
        document.getElementById("kpiProc").textContent = listaProcs.size;
        document.getElementById("kpiProf").textContent = listaProfs.size;

        renderCharts(profMap, diasMap);
    }

    function renderCharts(profData, diasData) {
        if(charts.p) charts.p.destroy();
        charts.p = new Chart(document.getElementById('chartProf'), {
            type: 'bar',
            data: { labels: Object.keys(profData), datasets: [{ label: 'Vagas', data: Object.values(profData), backgroundColor: '#1a2a6c' }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        if(charts.d) charts.d.destroy();
        charts.d = new Chart(document.getElementById('chartDias'), {
            type: 'doughnut',
            data: { labels: Object.keys(diasData), datasets: [{ data: Object.values(diasData), backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function popularFiltroProfissionais(dados) {
        const s = document.getElementById("selProfissional");
        const profs = [...new Set(dados.map(d => d.profissional))].sort();
        s.innerHTML = '<option value="all">Todos</option>' + profs.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // --- EVENTOS ---
    document.getElementById("btnSincronizar").onclick = sincronizar;
    document.getElementById("btnLogout").onclick = () => { if(confirm("Sair?")) { localStorage.clear(); window.location.href="index.html"; } };
    document.getElementById("selMes").onchange = aplicarFiltros;
    document.getElementById("inpAno").oninput = aplicarFiltros;
    document.getElementById("selProfissional").onchange = aplicarFiltros;

    // Carga inicial via Cache
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if (cache) {
        const d = JSON.parse(cache);
        renderizarTabela(d);
        popularFiltroProfissionais(d);
        aplicarFiltros();
    }
});
