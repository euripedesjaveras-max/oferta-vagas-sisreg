// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let charts = {};

    // --- 1. CARREGAR CRÉDITOS (Ajustado para garantir exibição) ---
    fetch("data/config.json")
        .then(r => r.json())
        .then(c => {
            const footer = document.getElementById("footerCreditos");
            if (footer) {
                footer.innerHTML = `
                    <p>© ${c.ano} - ${c.sistema}</p>
                    <p>Desenvolvido por: <strong>${c.desenvolvedor}</strong> • ${c.detalhes}</p>
                `;
            }
        }).catch(err => console.error("Erro ao carregar créditos:", err));

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // --- 2. SINCRONISMO (Lê do Sheets e joga na Tabela) ---
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
                aplicarFiltros(); // Filtra e atualiza gráficos após sincronizar
                
                document.getElementById("kpiStatus").textContent = "Nuvem";
                alert("Dados sincronizados com sucesso!");
            }
        } catch (e) {
            alert("Erro na comunicação com o Sheets.");
        } finally {
            btn.textContent = "🔄 Sincronizar Sheets";
            btn.disabled = false;
        }
    }

    // --- 3. RENDERIZAR TABELA (A fonte de dados) ---
    function renderizarTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dados.map(d => `
            <tr class="linha-dados" 
                data-prof="${d.profissional}" 
                data-vigencia="${d.vigencia_inicio}"
                data-vagas="${d.vagas}"
                data-dias="${d.dias_semana}">
                <td><strong>${d.profissional}</strong></td>
                <td>${d.procedimento}</td>
                <td>${d.dias_semana}</td>
                <td>${d.hora_inicio}</td>
                <td>${d.hora_fim}</td>
                <td class="col-vagas">${d.vagas}</td>
                <td>${d.vigencia_inicio}</td>
            </tr>
        `).join('');
    }

    // --- 4. APLICAR FILTROS NA TABELA ---
    function aplicarFiltros() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;
        
        const linhas = document.querySelectorAll(".linha-dados");

        linhas.forEach(tr => {
            const dataV = new Date(tr.dataset.vigencia + "T00:00:00");
            const prof = tr.dataset.prof;

            const matchMes = mesSel === "all" || dataV.getMonth() == mesSel;
            const matchAno = dataV.getFullYear() == anoSel;
            const matchProf = profSel === "all" || prof === profSel;

            if (matchMes && matchAno && matchProf) {
                tr.style.display = ""; // Mostra
            } else {
                tr.style.display = "none"; // Esconde
            }
        });

        atualizarGraficosDosVisiveis();
    }

    // --- 5. LER TABELA LOCAL E ATUALIZAR GRÁFICOS ---
    function atualizarGraficosDosVisiveis() {
        const linhasVisiveis = Array.from(document.querySelectorAll(".linha-dados")).filter(tr => tr.style.display !== "none");
        
        const profMap = {};
        const diasRef = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0 };
        let totalVagas = 0;
        let procedimentos = new Set();
        let profissionais = new Set();

        linhasVisiveis.forEach(tr => {
            const vagas = parseInt(tr.dataset.vagas) || 0;
            const prof = tr.dataset.prof;
            const dias = tr.dataset.dias;
            const proc = tr.children[1].textContent;

            // Acumular Vagas
            totalVagas += vagas;
            profissionais.add(prof);
            procedimentos.add(proc);

            // Mapa para Gráfico de Barras
            profMap[prof] = (profMap[prof] || 0) + vagas;

            // Mapa para Gráfico de Dias
            ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].forEach(dia => {
                if (dias.includes(dia)) diasRef[dia] += vagas;
            });
        });

        // Atualizar KPIs
        document.getElementById("kpiVagas").textContent = totalVagas;
        document.getElementById("kpiProc").textContent = procedimentos.size;
        document.getElementById("kpiProf").textContent = profissionais.size;

        // Renderizar Gráficos
        desenharCharts(profMap, diasRef);
    }

    function desenharCharts(profData, diasData) {
        // Profissionais
        if(charts.p) charts.p.destroy();
        charts.p = new Chart(document.getElementById('chartProf'), {
            type: 'bar',
            data: { 
                labels: Object.keys(profData), 
                datasets: [{ label: 'Vagas', data: Object.values(profData), backgroundColor: '#1a2a6c' }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // Distribuição Semanal
        if(charts.d) charts.d.destroy();
        charts.d = new Chart(document.getElementById('chartDias'), {
            type: 'doughnut',
            data: { 
                labels: Object.keys(diasData), 
                datasets: [{ data: Object.values(diasData), backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function popularFiltroProfissionais(dados) {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dados.map(d => d.profissional))].sort();
        select.innerHTML = '<option value="all">Todos</option>';
        profs.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
    }

    // --- EVENTOS ---
    document.getElementById("btnSincronizar").onclick = sincronizar;
    document.getElementById("btnLogout").onclick = () => {
        if(confirm("Deseja sair?")) {
            localStorage.clear();
            window.location.href = "index.html";
        }
    };
    
    document.getElementById("selMes").onchange = aplicarFiltros;
    document.getElementById("inpAno").oninput = aplicarFiltros;
    document.getElementById("selProfissional").onchange = aplicarFiltros;

    // CARGA INICIAL DO CACHE
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if (cache) {
        const dados = JSON.parse(cache);
        dadosCompletos = dados;
        renderizarTabela(dados);
        popularFiltroProfissionais(dados);
        aplicarFiltros();
    }
});
