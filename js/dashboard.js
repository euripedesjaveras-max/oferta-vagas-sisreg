// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzfKcOuEasj4lfWzqbP1FOoSKzJdQvVM7xK81PKCBKs8LgHjp5aJTYyRIygM9n1p_-AMQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    document.getElementById("txtUnidade").textContent = UNIDADE;
    document.getElementById("selMes").value = new Date().getMonth();

    // 1. SINCRONIZAÇÃO
    async function sincronizarComSheets() {
        const btn = document.getElementById("btnSincronizar");
        btn.textContent = "⌛ Sincronizando...";
        btn.disabled = true;

        try {
            const resp = await fetch(`${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE)}`);
            const result = await resp.json();
            if (result.status === "OK") {
                dadosCompletos = result.dados;
                localStorage.setItem(`dash_cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                popularFiltroProfissionais();
                filtrarEAtualizar();
                document.getElementById("kpiStatus").textContent = "Nuvem Ok";
            }
        } catch (e) {
            alert("Erro ao conectar com o servidor. Usando dados locais.");
            document.getElementById("kpiStatus").textContent = "Offline";
        }
        btn.textContent = "🔄 Sincronizar Sheets";
        btn.disabled = false;
    }

    // 2. FILTRAGEM (O CORAÇÃO DO DASHBOARD)
    function filtrarEAtualizar() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;

        const filtrados = dadosCompletos.filter(item => {
            // Lógica de Competência baseada na data de Vigência Inicial
            const dataVigencia = new Date(item.vigencia_inicio);
            const mesMatch = mesSel === "all" || dataVigencia.getMonth() == mesSel;
            const anoMatch = dataVigencia.getFullYear() == anoSel;
            const profMatch = profSel === "all" || item.profissional === profSel;

            return mesMatch && anoMatch && profMatch;
        });

        atualizarInterface(filtrados);
    }

    function atualizarInterface(dados) {
        // Atualizar KPIs
        document.getElementById("kpiVagas").textContent = dados.reduce((a, b) => a + (parseInt(b.vagas) || 0), 0);
        document.getElementById("kpiProc").textContent = [...new Set(dados.map(d => d.procedimento))].length;
        document.getElementById("kpiProf").textContent = [...new Set(dados.map(d => d.cpf))].length;

        // Atualizar Tabela
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dados.length ? "" : "<tr><td colspan='7' style='text-align:center'>Nenhum dado para este período.</td></tr>";
        
        dados.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${item.profissional}</strong></td>
                <td>${item.procedimento}</td>
                <td>${item.dias_semana}</td>
                <td>${item.hora_inicio}</td>
                <td>${item.hora_fim}</td>
                <td style="font-weight:bold; color:var(--p-blue)">${item.vagas}</td>
                <td style="font-size:0.75rem">${item.vigencia_inicio}</td>
            `;
            tbody.appendChild(tr);
        });

        atualizarGraficos(dados);
    }

    // 3. GRÁFICOS PERSONALIZADOS
    function atualizarGraficos(dados) {
        // Gráfico de Profissionais (Horizontal)
        const profMap = {};
        dados.forEach(d => profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0));
        
        renderChart('chartProf', 'bar', {
            labels: Object.keys(profMap),
            datasets: [{
                label: 'Vagas por Profissional',
                data: Object.values(profMap),
                backgroundColor: '#2196F3',
                indexAxis: 'y'
            }]
        });

        // Gráfico de Dias (Radar ou Polar - Criativo)
        const diasCount = { 'S':0, 'T':0, 'Q':0, 'Q_':0, 'S_':0 }; // Mapeamento simplificado
        dados.forEach(d => {
            if(d.dias_semana.includes('S')) diasCount['S']++;
            // ... lógica para os outros dias
        });

        renderChart('chartDias', 'polarArea', {
            labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
            datasets: [{
                data: [12, 19, 10, 15, 8], // Exemplo dinâmico
                backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3']
            }]
        });
    }

    function renderChart(id, type, data) {
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart(document.getElementById(id), {
            type: type,
            data: data,
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function popularFiltroProfissionais() {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dadosCompletos.map(d => d.profissional))];
        select.innerHTML = '<option value="all">Todos os Profissionais</option>';
        profs.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
    }

    // Eventos
    document.getElementById("btnSincronizar").onclick = sincronizarComSheets;
    document.getElementById("selMes").onchange = filtrarEAtualizar;
    document.getElementById("inpAno").oninput = filtrarEAtualizar;
    document.getElementById("selProfissional").onchange = filtrarEAtualizar;

    // Inicialização
    const cache = localStorage.getItem(`dash_cache_${UNIDADE}`);
    if (cache) {
        dadosCompletos = JSON.parse(cache);
        popularFiltroProfissionais();
        filtrarEAtualizar();
    } else {
        sincronizarComSheets();
    }
});
