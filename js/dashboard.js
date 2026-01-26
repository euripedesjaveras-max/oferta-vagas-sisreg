// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    let charts = {};

    // 1. Carregar Créditos (Apenas se o config.json existir)
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema}</p><p>${c.desenvolvedor}</p>`;
    }).catch(() => {});

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // 2. FUNÇÃO PRINCIPAL: Preencher a Tabela
    function popularTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        if (!tbody) return;
        tbody.innerHTML = ""; 

        dados.forEach(item => {
            // Normaliza as chaves para evitar erro de Maiúscula/Minúscula
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            const tr = document.createElement("tr");
            tr.className = "linha-dinamica";
            
            // Atributos ocultos para facilitar a leitura dos gráficos e filtros
            tr.setAttribute("data-prof", d.profissional || "");
            tr.setAttribute("data-vigencia", d.vigencia_inicio || "");
            tr.setAttribute("data-vagas", d.vagas || 0);
            tr.setAttribute("data-dias", d.dias_semana || "");

            tr.innerHTML = `
                <td>${d.cpf || ''}</td>
                <td><strong>${d.profissional || ''}</strong></td>
                <td>${d.cod_procedimento || ''}</td>
                <td>${d.procedimento || ''}</td>
                <td>${d.exames || ''}</td>
                <td>${d.dias_semana || ''}</td>
                <td>${d.hora_inicio || ''}</td>
                <td>${d.hora_fim || ''}</td>
                <td>${d.vagas || 0}</td>
                <td>${d.vigencia_inicio || ''}</td>
                <td>${d.vigencia_fim || ''}</td>
            `;
            tbody.appendChild(tr);
        });

        atualizarGraficosPelaTabela();
    }

    // 3. Ação de Sincronizar
    document.getElementById("btnSincronizar").onclick = async function() {
        this.textContent = "⌛ Sincronizando...";
        this.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();

            if (res.status === "OK") {
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(res.dados));
                popularTabela(res.dados);
                alert("Sincronizado com sucesso!");
            }
        } catch (e) {
            alert("Erro ao conectar com o servidor.");
        } finally {
            this.textContent = "🔄 Sincronizar Sheets";
            this.disabled = false;
        }
    };

    // 4. Lógica dos Gráficos (Lendo o que foi escrito na tabela acima)
    function atualizarGraficosPelaTabela() {
        const linhas = document.querySelectorAll(".linha-dinamica");
        let vTot = 0, profData = {}, diasData = {'Seg':0,'Ter':0,'Qua':0,'Qui':0,'Sex':0};

        linhas.forEach(tr => {
            const v = parseInt(tr.getAttribute("data-vagas")) || 0;
            const n = tr.getAttribute("data-prof");
            const d = tr.getAttribute("data-dias");

            vTot += v;
            if(n) profData[n] = (profData[n] || 0) + v;
            ['Seg','Ter','Qua','Qui','Sex'].forEach(dia => { if(d.includes(dia)) diasData[dia] += v; });
        });

        // Atualiza os números (KPIs) na tela
        if(document.getElementById("kpiVagas")) document.getElementById("kpiVagas").textContent = vTot;

        // Desenha os gráficos
        renderCharts(profData, diasData);
    }

    function renderCharts(pD, dD) {
        if(charts.p) charts.p.destroy();
        const ctxP = document.getElementById('chartProf');
        if(ctxP) {
            charts.p = new Chart(ctxP, {
                type: 'bar',
                data: { labels: Object.keys(pD), datasets: [{ label: 'Vagas', data: Object.values(pD), backgroundColor: '#1a2a6c' }]},
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
        }

        if(charts.d) charts.d.destroy();
        const ctxD = document.getElementById('chartDias');
        if(ctxD) {
            charts.d = new Chart(ctxD, {
                type: 'doughnut',
                data: { labels: Object.keys(dD), datasets: [{ data: Object.values(dD), backgroundColor: ['#1a2a6c','#b21f1f','#fdbb2d','#4CAF50','#2196F3'] }]},
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // Inicialização
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if(cache) popularTabela(JSON.parse(cache));
});
