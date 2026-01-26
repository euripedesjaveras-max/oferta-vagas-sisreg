// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    // --- CARREGAR CRÉDITOS CENTRALIZADOS ---
    fetch("data/config.json")
        .then(r => r.json())
        .then(c => {
            document.getElementById("footerCreditos").innerHTML = `
                <p>© ${c.ano} - ${c.sistema}</p>
                <p>Desenvolvido por: <strong>${c.desenvolvedor}</strong> • ${c.detalhes}</p>
            `;
        }).catch(() => console.log("Arquivo config.json não encontrado."));

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // --- FUNÇÃO DE SINCRONISMO (SOMENTE NO CLIQUE) ---
    async function sincronizar() {
        const btn = document.getElementById("btnSincronizar");
        btn.textContent = "⌛ Conectando...";
        btn.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const result = await resp.json();

            if (result.status === "OK") {
                dadosCompletos = result.dados;
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                
                popularFiltroProfissionais();
                atualizarInterface(); 
                
                document.getElementById("kpiStatus").textContent = "Nuvem";
                alert("Sincronização concluída!");
            }
        } catch (e) {
            alert("Erro ao ler dados do Sheets.");
        } finally {
            btn.textContent = "🔄 Sincronizar Sheets";
            btn.disabled = false;
        }
    }

    // --- ATUALIZAÇÃO DA TELA (Tabela Geral + Gráficos Filtrados) ---
    function atualizarInterface() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;

        // 1. FILTRAR DADOS APENAS PARA GRÁFICOS E KPIS
        const filtradosParaGraficos = dadosCompletos.filter(d => {
            if (!d.vigencia_inicio) return false;
            const dataV = new Date(d.vigencia_inicio + "T00:00:00");
            const matchMes = mesSel === "all" || dataV.getMonth() == mesSel;
            const matchAno = dataV.getFullYear() == anoSel;
            const matchProf = profSel === "all" || d.profissional === profSel;
            return matchMes && matchAno && matchProf;
        });

        // 2. PREENCHER TABELA (MOSTRA TUDO SEM FILTRO - Regra solicitada)
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dadosCompletos.map(d => `
            <tr>
                <td><strong>${d.profissional}</strong></td>
                <td>${d.procedimento}</td>
                <td>${d.dias_semana}</td>
                <td>${d.hora_inicio}</td>
                <td>${d.hora_fim}</td>
                <td>${d.vagas}</td>
                <td>${d.vigencia_inicio}</td>
            </tr>
        `).join('') || "<tr><td colspan='7'>Nenhum dado. Clique em sincronizar.</td></tr>";

        // 3. ATUALIZAR GRÁFICOS E KPIS COM OS FILTRADOS
        document.getElementById("kpiVagas").textContent = filtradosParaGraficos.reduce((a, b) => a + (parseInt(b.vagas) || 0), 0);
        document.getElementById("kpiProc").textContent = [...new Set(filtradosParaGraficos.map(d => d.procedimento))].length;
        document.getElementById("kpiProf").textContent = [...new Set(filtradosParaGraficos.map(d => d.profissional))].length;

        desenharGraficos(filtradosParaGraficos);
    }

    function desenharGraficos(dados) {
        // Gráfico Profissional
        const profMap = {};
        dados.forEach(d => profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0));

        if(charts.p) charts.p.destroy();
        charts.p = new Chart(document.getElementById('chartProf'), {
            type: 'bar',
            data: { labels: Object.keys(profMap), datasets: [{ label: 'Vagas', data: Object.values(profMap), backgroundColor: '#1a2a6c' }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // Gráfico Dias
        const diasRef = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0 };
        dados.forEach(d => {
            ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].forEach(dia => {
                if (d.dias_semana.includes(dia)) diasRef[dia] += (parseInt(d.vagas) || 0);
            });
        });

        if(charts.d) charts.d.destroy();
        charts.d = new Chart(document.getElementById('chartDias'), {
            type: 'doughnut',
            data: { labels: Object.keys(diasRef), datasets: [{ data: Object.values(diasRef), backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function popularFiltroProfissionais() {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dadosCompletos.map(d => d.profissional))].sort();
        select.innerHTML = '<option value="all">Todos</option>';
        profs.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
    }

    // --- EVENTOS ---
    document.getElementById("btnSincronizar").onclick = sincronizar;
    document.getElementById("btnLogout").onclick = () => {
        if(confirm("Deseja sair?")) {
            localStorage.removeItem("unidade_selecionada");
            window.location.href = "index.html";
        }
    };
    
    document.getElementById("selMes").onchange = atualizarInterface;
    document.getElementById("inpAno").oninput = atualizarInterface;
    document.getElementById("selProfissional").onchange = atualizarInterface;

    // CARGA INICIAL: SÓ CACHE
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if (cache) {
        dadosCompletos = JSON.parse(cache);
        popularFiltroProfissionais();
        atualizarInterface();
    }
});
