// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    // 1. CARREGAR CRÉDITOS E UNIDADE
    document.getElementById("txtUnidade").textContent = UNIDADE;
    
    fetch("data/config.json")
        .then(r => r.json())
        .then(c => {
            document.getElementById("footerDinamico").innerHTML = `
                <p>© ${c.ano} - ${c.sistema}</p>
                <p>Desenvolvido por: <strong>${c.desenvolvedor}</strong> • ${c.detalhes}</p>
            `;
        });

    // 2. FUNÇÃO DE SINCRONIZAÇÃO (SOMENTE AO CLICAR)
    async function sincronizar() {
        const btn = document.getElementById("btnSincronizar");
        btn.textContent = "⌛ Sincronizando...";
        btn.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const result = await resp.json();

            if (result.status === "OK") {
                dadosCompletos = result.dados;
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                
                popularFiltroProfissionais();
                atualizarTela(); // Processa tabela e gráficos
                
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

    // 3. ATUALIZAÇÃO DA TELA (TABELA COMPLETA + GRÁFICOS FILTRADOS)
    function atualizarTela() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const profSel = document.getElementById("selProfissional").value;

        // FILTRO PARA GRÁFICOS E KPIS
        const dadosFiltrados = dadosCompletos.filter(d => {
            if (!d.vigencia_inicio) return false;
            const dataV = new Date(d.vigencia_inicio + "T00:00:00");
            const matchMes = mesSel === "all" || dataV.getMonth() == mesSel;
            const matchAno = dataV.getFullYear() == anoSel;
            const matchProf = profSel === "all" || d.profissional === profSel;
            return matchMes && matchAno && matchProf;
        });

        // TABELA: MOSTRA SEMPRE TUDO DO SHEETS (Conforme solicitado)
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = dadosCompletos.map(d => `
            <tr>
                <td><strong>${d.profissional}</strong></td>
                <td>${d.procedimento}</td>
                <td>${d.dias_semana}</td>
                <td>${d.hora_inicio}</td>
                <td>${d.hora_fim}</td>
                <td style="font-weight:700; color:var(--p-blue)">${d.vagas}</td>
                <td>${d.vigencia_inicio}</td>
            </tr>
        `).join('') || "<tr><td colspan='7' style='text-align:center'>Clique em sincronizar para carregar.</td></tr>";

        // ATUALIZAR KPIS E GRÁFICOS COM OS DADOS FILTRADOS
        document.getElementById("kpiVagas").textContent = dadosFiltrados.reduce((a, b) => a + (parseInt(b.vagas) || 0), 0);
        document.getElementById("kpiProc").textContent = [...new Set(dadosFiltrados.map(d => d.procedimento))].length;
        document.getElementById("kpiProf").textContent = [...new Set(dadosFiltrados.map(d => d.profissional))].length;

        gerarGraficos(dadosFiltrados);
    }

    function gerarGraficos(dados) {
        // Gráfico Profissionais
        const profMap = {};
        dados.forEach(d => profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0));

        if(charts.p) charts.p.destroy();
        charts.p = new Chart(document.getElementById('chartProf'), {
            type: 'bar',
            data: { 
                labels: Object.keys(profMap), 
                datasets: [{ label: 'Vagas', data: Object.values(profMap), backgroundColor: '#1a2a6c' }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
        });

        // Gráfico Dias
        const diasRef = { 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0 };
        dados.forEach(d => {
            if (d.dias_semana.includes('Seg')) diasRef['Seg']++;
            if (d.dias_semana.includes('Ter')) diasRef['Ter']++;
            if (d.dias_semana.includes('Qua')) diasRef['Qua']++;
            if (d.dias_semana.includes('Qui')) diasRef['Qui']++;
            if (d.dias_semana.includes('Sex')) diasRef['Sex']++;
        });

        if(charts.d) charts.d.destroy();
        charts.d = new Chart(document.getElementById('chartDias'), {
            type: 'polarArea',
            data: { 
                labels: Object.keys(diasRef), 
                datasets: [{ data: Object.values(diasRef), backgroundColor: ['#1a2a6c', '#b21f1f', '#fdbb2d', '#4CAF50', '#2196F3'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function popularFiltroProfissionais() {
        const select = document.getElementById("selProfissional");
        const profs = [...new Set(dadosCompletos.map(d => d.profissional))].sort();
        select.innerHTML = '<option value="all">Todos</option>';
        profs.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
    }

    // 4. EVENTOS
    document.getElementById("btnSincronizar").onclick = sincronizar;
    document.getElementById("btnLogout").onclick = () => {
        if(confirm("Deseja encerrar a sessão?")) {
            localStorage.removeItem("unidade_selecionada");
            window.location.href = "index.html";
        }
    };

    document.getElementById("selMes").onchange = atualizarTela;
    document.getElementById("inpAno").oninput = atualizarTela;
    document.getElementById("selProfissional").onchange = atualizarTela;

    // CARGA INICIAL (LOCAL)
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if (cache) {
        dadosCompletos = JSON.parse(cache);
        popularFiltroProfissionais();
        atualizarTela();
    }
});
