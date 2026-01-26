// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    // NOVA URL FORNECIDA
    const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    // Inicialização da Interface
    document.getElementById("txtUnidade").textContent = UNIDADE;
    // Define o mês atual como padrão no filtro
    document.getElementById("selMes").value = new Date().getMonth();

    // ==========================================
    // 1. FUNÇÃO DE SINCRONIZAÇÃO (GET)
    // ==========================================
    async function sincronizarComSheets() {
        const btn = document.getElementById("btnSincronizar");
        const statusKpi = document.getElementById("kpiStatus");
        
        btn.textContent = "⌛ Conectando...";
        btn.disabled = true;

        try {
            // Requisição GET passando a unidade como parâmetro
            const resp = await fetch(`${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE)}`);
            const result = await resp.json();
            
            if (result.status === "OK") {
                dadosCompletos = result.dados;
                // Salva no cache local para evitar requisições repetidas
                localStorage.setItem(`dash_cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                
                popularFiltroProfissionais();
                filtrarEAtualizar();
                
                statusKpi.textContent = "Nuvem Ok";
                statusKpi.style.color = "#4CAF50";
            } else {
                throw new Error(result.mensagem);
            }
        } catch (e) {
            console.error("Erro na sincronização:", e);
            statusKpi.textContent = "Erro Sinc.";
            statusKpi.style.color = "#f44336";
            alert("Não foi possível buscar dados novos. Verifique sua conexão ou a publicação do Apps Script.");
        }
        
        btn.textContent = "🔄 Sincronizar Sheets";
        btn.disabled = false;
    }

    // ==========================================
    // 2. LÓGICA DE FILTRO E COMPETÊNCIA
    // ==========================================
    function filtrarEAtualizar() {
        const mesSel = document.getElementById("selMes").value; // 0-11
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;

        const filtrados = dadosCompletos.filter(item => {
            // Assume que vigencia_inicio vem no formato YYYY-MM-DD
            const dataVigencia = new Date(item.vigencia_inicio + "T00:00:00");
            
            const mesMatch = mesSel === "all" || dataVigencia.getMonth() == mesSel;
            const anoMatch = dataVigencia.getFullYear() == anoSel;
            const profMatch = profSel === "all" || item.profissional === profSel;

            return mesMatch && anoMatch && profMatch;
        });

        atualizarInterface(filtrados);
    }

    // ==========================================
    // 3. ATUALIZAÇÃO DA INTERFACE (TABELA E KPIS)
    // ==========================================
    function atualizarInterface(dados) {
        // Atualizar KPIs
        const totalVagas = dados.reduce((a, b) => a + (parseInt(b.vagas) || 0), 0);
        document.getElementById("kpiVagas").textContent = totalVagas;
        document.getElementById("kpiProc").textContent = [...new Set(dados.map(d => d.procedimento))].length;
        document.getElementById("kpiProf").textContent = [...new Set(dados.map(d => d.cpf))].length;

        // Atualizar Tabela
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = "";

        if (dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding: 20px;'>Nenhuma escala encontrada para esta competência.</td></tr>";
        } else {
            dados.forEach(item => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${item.profissional}</strong></td>
                    <td>${item.procedimento}</td>
                    <td><span class="badge-dia">${item.dias_semana}</span></td>
                    <td>${item.hora_inicio}</td>
                    <td>${item.hora_fim}</td>
                    <td style="font-weight:bold; color:#1a2a6c">${item.vagas}</td>
                    <td>${new Date(item.vigencia_inicio + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        atualizarGraficos(dados);
    }

    // ==========================================
    // 4. GRÁFICOS DINÂMICOS (CHART.JS)
    // ==========================================
    function atualizarGraficos(dados) {
        // Gráfico 1: Vagas por Profissional
        const profMap = {};
        dados.forEach(d => {
            profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0);
        });

        renderChart('chartProf', 'bar', {
            labels: Object.keys(profMap),
            datasets: [{
                label: 'Total de Vagas',
                data: Object.values(profMap),
                backgroundColor: '#1a2a6c',
                borderRadius: 5
            }]
        }, { indexAxis: 'y' });

        // Gráfico 2: Distribuição por Dia da Semana
        const diasRef = { 'Segunda': 0, 'Terça': 0, 'Quarta': 0, 'Quinta': 0, 'Sexta': 0 };
        dados.forEach(d => {
            if (d.dias_semana.includes('Seg')) diasRef['Segunda'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Ter')) diasRef['Terça'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Qua')) diasRef['Quarta'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Qui')) diasRef['Quinta'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Sex')) diasRef['Sexta'] += parseInt(d.vagas);
        });

        renderChart('chartDias', 'doughnut', {
            labels: Object.keys(diasRef),
            datasets: [{
                data: Object.values(diasRef),
                backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3'],
                hoverOffset: 10
            }]
        });
    }

    function renderChart(id, type, data, extraOptions = {}) {
        if (charts[id]) charts[id].destroy();
        const ctx = document.getElementById(id).getContext('2d');
        charts[id] = new Chart(ctx, {
            type: type,
            data: data,
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                ...extraOptions 
            }
        });
    }

    function popularFiltroProfissionais() {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dadosCompletos.map(d => d.profissional))].sort();
        select.innerHTML = '<option value="all">Todos os Profissionais</option>';
        profs.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            select.appendChild(opt);
        });
    }

    // Ouvintes de Eventos
    document.getElementById("btnSincronizar").onclick = sincronizarComSheets;
    document.getElementById("selMes").onchange = filtrarEAtualizar;
    document.getElementById("inpAno").oninput = filtrarEAtualizar;
    document.getElementById("selProfissional").onchange = filtrarEAtualizar;

    // Carregamento Inicial (Tenta Cache, se não houver, sincroniza)
    const cacheLocal = localStorage.getItem(`dash_cache_${UNIDADE}`);
    if (cacheLocal) {
        dadosCompletos = JSON.parse(cacheLocal);
        popularFiltroProfissionais();
        filtrarEAtualizar();
        document.getElementById("kpiStatus").textContent = "Local (Cache)";
    } else {
        sincronizarComSheets();
    }
});
