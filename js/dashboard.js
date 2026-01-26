// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    let charts = {};

    // Carregar Créditos do arquivo externo
    fetch("data/config.json").then(r => r.json()).then(c => {
        document.getElementById("footerCreditos").innerHTML = `<p>© ${c.ano} - ${c.sistema}</p><p>${c.desenvolvedor} • ${c.detalhes}</p>`;
    }).catch(() => console.log("Config não encontrado."));

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // Ação do Botão Sincronizar
    document.getElementById("btnSincronizar").onclick = async function() {
        this.textContent = "⌛ Sincronizando...";
        this.disabled = true;
        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();
            if(res.status === "OK") {
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(res.dados));
                renderizarTabela(res.dados);
                popularFiltroProfissionais(res.dados);
                aplicarFiltros();
                document.getElementById("kpiStatus").textContent = "Nuvem";
            }
        } catch (e) { alert("Erro ao sincronizar."); }
        this.textContent = "🔄 Sincronizar Sheets";
        this.disabled = false;
    };

    function renderizarTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dados.map(d => `
            <tr class="row-data" data-prof="${d.profissional}" data-vigencia="${d.vigencia_inicio}" data-vagas="${d.vagas}" data-dias="${d.dias_semana}">
                <td>${d.cpf || ''}</td>
                <td><strong>${d.profissional}</strong></td>
                <td>${d.cod_procedimento || ''}</td>
                <td>${d.procedimento}</td>
                <td>${d.exames || ''}</td>
                <td>${d.dias_semana}</td>
                <td>${d.hora_inicio}</td>
                <td>${d.hora_fim}</td>
                <td>${d.vagas}</td>
                <td>${d.vigencia_inicio}</td>
                <td>${d.vigencia_fim || ''}</td>
            </tr>
        `).join('');
    }

    function aplicarFiltros() {
        const mes = document.getElementById("selMes").value;
        const ano = document.getElementById("inpAno").value;
        const prof = document.getElementById("selProfissional").value;
        const rows = document.querySelectorAll(".row-data");

        rows.forEach(tr => {
            const dv = new Date(tr.dataset.vigencia + "T00:00:00");
            const matchM = mes === "all" || dv.getMonth() == mes;
            const matchA = dv.getFullYear() == ano;
            const matchP = prof === "all" || tr.dataset.prof === prof;
            tr.style.display = (matchM && matchA && matchP) ? "" : "none";
        });
        atualizarGraficos();
    }

    function atualizarGraficos() {
        const visiveis = Array.from(document.querySelectorAll(".row-data")).filter(r => r.style.display !== "none");
        let vTot = 0, pSet = new Set(), prSet = new Set(), profData = {}, diasData = {'Seg':0,'Ter':0,'Qua':0,'Qui':0,'Sex':0};

        visiveis.forEach(r => {
            const v = parseInt(r.dataset.vagas) || 0;
            const n = r.dataset.prof;
            const d = r.dataset.dias;
            vTot += v;
            pSet.add(n);
            prSet.add(r.cells[3].textContent);
            profData[n] = (profData[n] || 0) + v;
            ['Seg','Ter','Qua','Qui','Sex'].forEach(dia => { if(d.includes(dia)) diasData[dia] += v; });
        });

        document.getElementById("kpiVagas").textContent = vTot;
        document.getElementById("kpiProf").textContent = pSet.size;
        document.getElementById("kpiProc").textContent = prSet.size;

        renderizarCharts(profData, diasData);
    }

    function renderizarCharts(pD, dD) {
        if(charts.p) charts.p.destroy();
        charts.p = new Chart(document.getElementById('chartProf'), {
            type: 'bar',
            data: { labels: Object.keys(pD), datasets: [{ label: 'Vagas', data: Object.values(pD), backgroundColor: '#1a2a6c' }]},
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });
        if(charts.d) charts.d.destroy();
        charts.d = new Chart(document.getElementById('chartDias'), {
            type: 'doughnut',
            data: { labels: Object.keys(dD), datasets: [{ data: Object.values(dD), backgroundColor: ['#1a2a6c','#b21f1f','#fdbb2d','#4CAF50','#2196F3'] }]},
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function popularFiltroProfissionais(dados) {
        const s = document.getElementById("selProfissional");
        const ps = [...new Set(dados.map(d => d.profissional))].sort();
        s.innerHTML = '<option value="all">Todos</option>' + ps.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    document.getElementById("selMes").onchange = aplicarFiltros;
    document.getElementById("inpAno").oninput = aplicarFiltros;
    document.getElementById("selProfissional").onchange = aplicarFiltros;
    document.getElementById("btnLogout").onclick = () => { localStorage.clear(); window.location.href="index.html"; };

    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if(cache) { 
        const d = JSON.parse(cache); 
        renderizarTabela(d); 
        popularFiltroProfissionais(d); 
        aplicarFiltros(); 
    }
});
