// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    // 1. Configurações Iniciais
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    let charts = {};

    // Carregar Créditos Centralizados
    fetch("data/config.json")
        .then(r => r.json())
        .then(c => {
            const footer = document.getElementById("footerCreditos");
            if (footer) {
                footer.innerHTML = `<p>© ${c.ano} - ${c.sistema}</p><p>${c.desenvolvedor} • ${c.detalhes}</p>`;
            }
        }).catch(() => console.log("Arquivo config.json não encontrado ou inacessível."));

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // 2. FUNÇÃO PARA NORMALIZAR DADOS (Evita erro de nomes de colunas do Sheets)
    function normalizarDados(obj) {
        const novoObj = {};
        for (let chave in obj) {
            novoObj[chave.toLowerCase().trim()] = obj[chave];
        }
        return novoObj;
    }

    // 3. AÇÃO DO BOTÃO SINCRONIZAR
    document.getElementById("btnSincronizar").onclick = async function() {
        this.textContent = "⌛ Conectando...";
        this.disabled = true;
        
        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();
            
            if (res.status === "OK" && res.dados) {
                // Normaliza todos os dados vindos do Sheets antes de salvar
                const dadosNormalizados = res.dados.map(d => normalizarDados(d));
                
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(dadosNormalizados));
                renderizarTabela(dadosNormalizados);
                popularFiltroProfissionais(dadosNormalizados);
                aplicarFiltros();
                
                document.getElementById("kpiStatus").textContent = "Sincronizado";
                alert("Dados carregados com sucesso!");
            } else {
                alert("O Sheets respondeu, mas não encontrou dados para esta unidade.");
            }
        } catch (e) {
            console.error("Erro técnico:", e);
            alert("Erro de comunicação! Verifique se o Apps Script está publicado corretamente.");
        } finally {
            this.textContent = "🔄 Sincronizar Sheets";
            this.disabled = false;
        }
    };

    // 4. RENDERIZAR TABELA (Lê as propriedades normalizadas)
    function renderizarTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        if (!tbody) return;

        if (dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center'>Nenhum registro encontrado para esta unidade.</td></tr>";
            return;
        }

        tbody.innerHTML = dados.map(d => `
            <tr class="row-data" 
                data-prof="${d.profissional || ''}" 
                data-vigencia="${d.vigencia_inicio || ''}" 
                data-vagas="${d.vagas || 0}" 
                data-dias="${d.dias_semana || ''}">
                <td>${d.cpf || ''}</td>
                <td><strong>${d.profissional || 'N/A'}</strong></td>
                <td>${d.cod_procedimento || ''}</td>
                <td>${d.procedimento || ''}</td>
                <td>${d.exames || ''}</td>
                <td>${d.dias_semana || ''}</td>
                <td>${d.hora_inicio || ''}</td>
                <td>${d.hora_fim || ''}</td>
                <td>${d.vagas || 0}</td>
                <td>${d.vigencia_inicio || ''}</td>
                <td>${d.vigencia_fim || ''}</td>
            </tr>
        `).join('');
    }

    // 5. FILTROS E GRÁFICOS (Lê da Tabela HTML)
    function aplicarFiltros() {
        const mes = document.getElementById("selMes").value;
        const ano = document.getElementById("inpAno").value;
        const prof = document.getElementById("selProfissional").value;
        const rows = document.querySelectorAll(".row-data");

        rows.forEach(tr => {
            const dataStr = tr.dataset.vigencia;
            if (!dataStr) { tr.style.display = "none"; return; }
            
            const dv = new Date(dataStr + "T00:00:00");
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
            if(n) pSet.add(n);
            prSet.add(r.cells[3].textContent);
            if(n) profData[n] = (profData[n] || 0) + v;
            ['Seg','Ter','Qua','Qui','Sex'].forEach(dia => { if(d && d.includes(dia)) diasData[dia] += v; });
        });

        document.getElementById("kpiVagas").textContent = vTot;
        document.getElementById("kpiProf").textContent = pSet.size;
        document.getElementById("kpiProc").textContent = prSet.size;

        renderizarCharts(profData, diasData);
    }

    function renderizarCharts(pD, dD) {
        if(charts.p) charts.p.destroy();
        const ctxP = document.getElementById('chartProf');
        if (ctxP) {
            charts.p = new Chart(ctxP, {
                type: 'bar',
                data: { labels: Object.keys(pD), datasets: [{ label: 'Vagas', data: Object.values(pD), backgroundColor: '#1a2a6c' }]},
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
        }

        if(charts.d) charts.d.destroy();
        const ctxD = document.getElementById('chartDias');
        if (ctxD) {
            charts.d = new Chart(ctxD, {
                type: 'doughnut',
                data: { labels: Object.keys(dD), datasets: [{ data: Object.values(dD), backgroundColor: ['#1a2a6c','#b21f1f','#fdbb2d','#4CAF50','#2196F3'] }]},
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    function popularFiltroProfissionais(dados) {
        const s = document.getElementById("selProfissional");
        if (!s) return;
        const ps = [...new Set(dados.map(d => d.profissional).filter(p => p))].sort();
        s.innerHTML = '<option value="all">Todos os Profissionais</option>' + ps.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    // Eventos
    document.getElementById("selMes").onchange = aplicarFiltros;
    document.getElementById("inpAno").oninput = aplicarFiltros;
    document.getElementById("selProfissional").onchange = aplicarFiltros;
    document.getElementById("btnLogout").onclick = () => { localStorage.clear(); window.location.href="index.html"; };

    // Carga inicial
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if(cache) { 
        const d = JSON.parse(cache); 
        renderizarTabela(d); 
        popularFiltroProfissionais(d); 
        aplicarFiltros(); 
    }
});
