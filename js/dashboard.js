// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    // URL FORNECIDA POR VOCÊ
    const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    // Inicialização da Tela
    document.getElementById("txtUnidade").textContent = UNIDADE;
    document.getElementById("selMes").value = new Date().getMonth();

    // ==========================================
    // 1. FUNÇÃO DE SINCRONIZAÇÃO (SOMENTE NO CLIQUE)
    // ==========================================
    async function sincronizarComSheets() {
        const btn = document.getElementById("btnSincronizar");
        btn.textContent = "⌛ Conectando ao Sheets...";
        btn.disabled = true;

        // Montagem da URL com parâmetro para evitar cache e callback para evitar erro de CORS
        const urlFinal = `${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE)}&t=${new Date().getTime()}`;

        try {
            // Usando fetch com modo no-cors ou tratando o JSONP se necessário. 
            // Mas com o Apps Script configurado para "Qualquer pessoa", o fetch padrão deve funcionar:
            const response = await fetch(urlFinal);
            const result = await response.json();

            if (result.status === "OK") {
                dadosCompletos = result.dados;
                // Salva localmente para o próximo login
                localStorage.setItem(`dash_cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                
                popularFiltroProfissionais();
                filtrarEAtualizar();
                
                document.getElementById("kpiStatus").textContent = "Sincronizado";
                document.getElementById("kpiStatus").style.color = "#4CAF50";
                alert("Sincronização realizada com sucesso!");
            } else {
                alert("Erro reportado pelo servidor: " + result.mensagem);
            }
        } catch (error) {
            console.error("Erro crítico de conexão:", error);
            alert("Erro de comunicação! Certifique-se de que o Apps Script está publicado como 'App da Web' e 'Qualquer pessoa' tem acesso.");
        } finally {
            btn.textContent = "🔄 Sincronizar Sheets";
            btn.disabled = false;
        }
    }

    // ==========================================
    // 2. FILTRAGEM E VISUALIZAÇÃO
    // ==========================================
    function filtrarEAtualizar() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;

        const filtrados = dadosCompletos.filter(item => {
            if (!item.vigencia_inicio) return false;
            const dataVig = new Date(item.vigencia_inicio + "T00:00:00");
            
            const mesMatch = mesSel === "all" || dataVig.getMonth() == mesSel;
            const anoMatch = dataVig.getFullYear() == anoSel;
            const profMatch = profSel === "all" || item.profissional === profSel;

            return mesMatch && anoMatch && profMatch;
        });

        exibirDados(filtrados);
    }

    function exibirDados(dados) {
        // Atualiza KPIs
        document.getElementById("kpiVagas").textContent = dados.reduce((a, b) => a + (parseInt(b.vagas) || 0), 0);
        document.getElementById("kpiProf").textContent = [...new Set(dados.map(d => d.profissional))].length;

        // Atualiza Tabela
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dados.map(item => `
            <tr>
                <td><strong>${item.profissional}</strong></td>
                <td>${item.procedimento}</td>
                <td>${item.dias_semana}</td>
                <td>${item.hora_inicio}</td>
                <td>${item.hora_fim}</td>
                <td>${item.vagas}</td>
                <td>${item.vigencia_inicio}</td>
            </tr>
        `).join('') || "<tr><td colspan='7'>Nenhum dado encontrado.</td></tr>";

        atualizarGraficos(dados);
    }

    function atualizarGraficos(dados) {
        const profMap = {};
        dados.forEach(d => profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0));

        // Gráfico de Barras Horizontal
        renderChart('chartProf', 'bar', {
            labels: Object.keys(profMap),
            datasets: [{ label: 'Vagas', data: Object.values(profMap), backgroundColor: '#1a2a6c' }]
        }, { indexAxis: 'y' });
    }

    function renderChart(id, type, data, options = {}) {
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart(document.getElementById(id), {
            type: type,
            data: data,
            options: { responsive: true, maintainAspectRatio: false, ...options }
        });
    }

    function popularFiltroProfissionais() {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dadosCompletos.map(d => d.profissional))].sort();
        select.innerHTML = '<option value="all">Todos os Profissionais</option>';
        profs.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
    }

    // ==========================================
    // 3. BOTÕES E LOGOUT
    // ==========================================
    document.getElementById("btnSincronizar").onclick = sincronizarComSheets;
    
    document.getElementById("btnLogout").onclick = () => {
        if (confirm("Deseja sair do sistema?")) {
            localStorage.removeItem("unidade_selecionada");
            // Mantemos o cache para o próximo login conforme sua regra
            window.location.href = "index.html";
        }
    };

    // Filtros
    document.getElementById("selMes").onchange = filtrarEAtualizar;
    document.getElementById("inpAno").oninput = filtrarEAtualizar;
    document.getElementById("selProfissional").onchange = filtrarEAtualizar;

    // CARGA INICIAL (SOMENTE LOCALSTORAGE)
    const cacheLocal = localStorage.getItem(`dash_cache_${UNIDADE}`);
    if (cacheLocal) {
        dadosCompletos = JSON.parse(cacheLocal);
        popularFiltroProfissionais();
        filtrarEAtualizar();
        document.getElementById("kpiStatus").textContent = "Modo Offline (Cache)";
    }
});
