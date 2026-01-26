// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    // 1. Inicializar Interface
    document.getElementById("txtUnidade").textContent = UNIDADE;
    document.getElementById("selMes").value = new Date().getMonth();

    // ==========================================
    // SINCRONISMO (APENAS NO CLIQUE)
    // ==========================================
    async function sincronizarComSheets() {
        const btn = document.getElementById("btnSincronizar");
        const statusKpi = document.getElementById("kpiStatus");
        
        btn.textContent = "⌛ Conectando...";
        btn.disabled = true;

        try {
            // Requisição com timestamp para evitar cache do navegador
            const urlComCacheBuster = `${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE)}&t=${new Date().getTime()}`;
            const resp = await fetch(urlComCacheBuster);
            const result = await resp.json();
            
            if (result.status === "OK") {
                dadosCompletos = result.dados;
                localStorage.setItem(`dash_cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                
                popularFiltroProfissionais();
                filtrarEAtualizar();
                
                statusKpi.textContent = "Nuvem Ok";
                statusKpi.style.color = "#4CAF50";
                alert("Dados sincronizados com sucesso!");
            }
        } catch (e) {
            console.error("Erro na sincronização:", e);
            statusKpi.textContent = "Erro na Conexão";
            statusKpi.style.color = "#f44336";
            alert("Falha ao sincronizar. Verifique se o Apps Script está publicado corretamente.");
        }
        
        btn.textContent = "🔄 Sincronizar Sheets";
        btn.disabled = false;
    }

    // ==========================================
    // FILTRAGEM E ATUALIZAÇÃO
    // ==========================================
    function filtrarEAtualizar() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;

        const filtrados = dadosCompletos.filter(item => {
            if (!item.vigencia_inicio) return false;
            // Trata a data para evitar problemas de fuso
            const dataVigencia = new Date(item.vigencia_inicio + "T00:00:00");
            
            const mesMatch = mesSel === "all" || dataVigencia.getMonth() == mesSel;
            const anoMatch = dataVigencia.getFullYear() == anoSel;
            const profMatch = profSel === "all" || item.profissional === profSel;

            return mesMatch && anoMatch && profMatch;
        });

        atualizarInterface(filtrados);
    }

    function atualizarInterface(dados) {
        document.getElementById("kpiVagas").textContent = dados.reduce((a, b) => a + (parseInt(b.vagas) || 0), 0);
        document.getElementById("kpiProc").textContent = [...new Set(dados.map(d => d.procedimento))].length;
        document.getElementById("kpiProf").textContent = [...new Set(dados.map(d => d.cpf))].length;

        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dados.length ? "" : "<tr><td colspan='7' style='text-align:center; padding:20px;'>Sem dados para este filtro.</td></tr>";
        
        dados.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${item.profissional}</strong></td>
                <td>${item.procedimento}</td>
                <td><span class="badge-dia">${item.dias_semana}</span></td>
                <td>${item.hora_inicio}</td>
                <td>${item.hora_fim}</td>
                <td style="font-weight:bold;">${item.vagas}</td>
                <td>${item.vigencia_inicio}</td>
            `;
            tbody.appendChild(tr);
        });

        atualizarGraficos(dados);
    }

    function atualizarGraficos(dados) {
        // Vagas por Profissional
        const profMap = {};
        dados.forEach(d => profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0));
        
        renderChart('chartProf', 'bar', {
            labels: Object.keys(profMap),
            datasets: [{ label: 'Vagas', data: Object.values(profMap), backgroundColor: '#1a2a6c' }]
        }, { indexAxis: 'y' });

        // Vagas por Dia
        const diasRef = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0 };
        dados.forEach(d => {
            if (d.dias_semana.includes('Seg')) diasRef['Seg'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Ter')) diasRef['Ter'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Qua')) diasRef['Qua'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Qui')) diasRef['Qui'] += parseInt(d.vagas);
            if (d.dias_semana.includes('Sex')) diasRef['Sex'] += parseInt(d.vagas);
        });

        renderChart('chartDias', 'doughnut', {
            labels: Object.keys(diasRef),
            datasets: [{ data: Object.values(diasRef), backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3'] }]
        });
    }

    function renderChart(id, type, data, extra = {}) {
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart(document.getElementById(id), {
            type: type,
            data: data,
            options: { responsive: true, maintainAspectRatio: false, ...extra }
        });
    }

    function popularFiltroProfissionais() {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dadosCompletos.map(d => d.profissional))].sort();
        select.innerHTML = '<option value="all">Todos os Profissionais</option>';
        profs.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
    }

    // ==========================================
    // LOGOUT E EVENTOS
    // ==========================================
    document.getElementById("btnLogout").onclick = () => {
        if(confirm("Deseja realmente encerrar a sessão?")) {
            localStorage.removeItem("unidade_selecionada");
            window.location.href = "index.html";
        }
    };

    document.getElementById("btnSincronizar").onclick = sincronizarComSheets;
    document.getElementById("selMes").onchange = filtrarEAtualizar;
    document.getElementById("inpAno").oninput = filtrarEAtualizar;
    document.getElementById("selProfissional").onchange = filtrarEAtualizar;

    // CARREGAMENTO INICIAL: APENAS CACHE LOCAL
    const cacheLocal = localStorage.getItem(`dash_cache_${UNIDADE}`);
    if (cacheLocal) {
        dadosCompletos = JSON.parse(cacheLocal);
        popularFiltroProfissionais();
        filtrarEAtualizar();
        document.getElementById("kpiStatus").textContent = "Dados Locais";
    }
});
