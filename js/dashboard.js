// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    let charts = {};

    // 1. Créditos (config.json)
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema}</p><p>${c.desenvolvedor}</p>`;
    }).catch(() => {});

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // --- FUNÇÕES DE FORMATAÇÃO ---
    function formatarHora(valor) {
        if (!valor) return '';
        if (typeof valor === "string" && valor.includes('T')) {
            return valor.split('T')[1].substring(0, 5);
        }
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

    // --- 2. POPULAR TABELA ---
    function popularTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        if (!tbody) return;
        tbody.innerHTML = ""; 

        dados.forEach(item => {
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            const tr = document.createElement("tr");
            tr.className = "linha-dinamica";
            
            // Atributos para os filtros compararem
            tr.setAttribute("data-prof", (d.profissional || "").trim());
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
                <td>${formatarHora(d.hora_inicio)}</td>
                <td>${formatarHora(d.hora_fim)}</td>
                <td>${d.vagas || 0}</td>
                <td>${formatarDataBR(d.vigencia_inicio)}</td>
                <td>${formatarDataBR(d.vigencia_fim)}</td>
            `;
            tbody.appendChild(tr);
        });

        popularSelectProfissionais(dados);
        aplicarFiltros(); // Chama o filtro logo após carregar para validar Ano/Mês atual
    }

    // --- 3. LÓGICA DE FILTRO ---
    function aplicarFiltros() {
        const mesSel = document.getElementById("selMes").value; // "all" ou "0" a "11"
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;
        
        const linhas = document.querySelectorAll(".linha-dinamica");

        linhas.forEach(tr => {
            const dataISO = tr.getAttribute("data-vigencia");
            const profLinha = tr.getAttribute("data-prof");
            
            let dataObj = dataISO ? new Date(dataISO + (dataISO.includes('T') ? '' : 'T00:00:00')) : null;

            // Verificações
            const matchMes = (mesSel === "all") || (dataObj && dataObj.getMonth() == mesSel);
            const matchAno = (anoSel === "") || (dataObj && dataObj.getFullYear() == anoSel);
            const matchProf = (profSel === "all") || (profLinha === profSel);

            if (matchMes && matchAno && matchProf) {
                tr.style.display = ""; // Mostra
            } else {
                tr.style.display = "none"; // Esconde
            }
        });

        // Após filtrar a tabela, atualiza os gráficos apenas com o que sobrou visível
        atualizarGraficosPelaTabela();
    }

    // --- 4. ATUALIZAR GRÁFICOS (Baseado no que está na Tabela) ---
    function atualizarGraficosPelaTabela() {
        const visiveis = Array.from(document.querySelectorAll(".linha-dinamica")).filter(tr => tr.style.display !== "none");
        
        let vTot = 0, pMap = {}, dMap = {'Seg':0,'Ter':0,'Qua':0,'Qui':0,'Sex':0};

        visiveis.forEach(tr => {
            const vagas = parseInt(tr.getAttribute("data-vagas")) || 0;
            const prof = tr.getAttribute("data-prof");
            const dias = tr.getAttribute("data-dias");

            vTot += vagas;
            if(prof) pMap[prof] = (pMap[prof] || 0) + vagas;
            
            ['Seg','Ter','Qua','Qui','Sex'].forEach(dia => {
                if(dias && dias.includes(dia)) dMap[dia] += vagas;
            });
        });

        // Atualiza KPI na tela
        const kpi = document.getElementById("kpiVagas");
        if(kpi) kpi.textContent = vTot;

        renderCharts(pMap, dMap);
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

    function popularSelectProfissionais(dados) {
        const s = document.getElementById("selProfissional");
        if(!s) return;
        const profs = [...new Set(dados.map(d => (d.profissional || d.PROFISSIONAL || "").trim()))].filter(p => p).sort();
        s.innerHTML = '<option value="all">Todos os Profissionais</option>' + profs.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // --- EVENTOS ---
    document.getElementById("btnSincronizar").onclick = async function() {
        this.textContent = "⌛ Sincronizando...";
        this.disabled = true;
        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();
            if (res.status === "OK") {
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(res.dados));
                popularTabela(res.dados);
                alert("Dados atualizados e sincronizados!");
            }
        } catch (e) { alert("Erro ao conectar."); }
        finally { this.textContent = "🔄 Sincronizar Sheets"; this.disabled = false; }
    };

    // Ativa os filtros ao interagir com os campos
    document.getElementById("selMes").addEventListener("change", aplicarFiltros);
    document.getElementById("inpAno").addEventListener("input", aplicarFiltros);
    document.getElementById("selProfissional").addEventListener("change", aplicarFiltros);

    document.getElementById("btnLogout").onclick = () => { localStorage.clear(); window.location.href="index.html"; };

    // Carga inicial
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if(cache) popularTabela(JSON.parse(cache));
});
