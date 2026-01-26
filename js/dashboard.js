// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    
    let dadosCompletos = [];
    let charts = {};

    // ==========================================
    // CONFIGURAÇÃO CENTRAL DE CRÉDITOS
    // ==========================================
    const configRodape = {
        ano: "2026",
        sistema: "Sistema de Gestão de Agendas SISREG",
        desenvolvedor: "Seu Nome/Empresa",
        detalhes: "Complexo Regulador do Amazonas"
    };

    function carregarCreditos() {
        document.getElementById("footerCreditos").innerHTML = `
            <p>© ${configRodape.ano} - ${configRodape.sistema}</p>
            <p>Desenvolvido por: <strong>${configRodape.desenvolvedor}</strong> • ${configRodape.detalhes}</p>
        `;
    }

    // ==========================================
    // FUNÇÃO DE SINCRONIZAÇÃO (SOMENTE NO CLIQUE)
    // ==========================================
    async function sincronizarDados() {
        const btn = document.getElementById("btnSincronizar");
        btn.textContent = "⌛ Sincronizando...";
        btn.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${new Date().getTime()}`);
            const result = await resp.json();

            if (result.status === "OK") {
                dadosCompletos = result.dados;
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(dadosCompletos));
                
                popularFiltros();
                processarEExibir();
                
                document.getElementById("kpiStatus").textContent = "Nuvem Atualizada";
                alert("Dados atualizados com sucesso!");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao conectar com o Sheets. Verifique o console.");
        } finally {
            btn.textContent = "🔄 Sincronizar Sheets";
            btn.disabled = false;
        }
    }

    // ==========================================
    // PROCESSAMENTO E FILTROS
    // ==========================================
    function processarEExibir() {
        const mes = document.getElementById("selMes").value;
        const ano = document.getElementById("inpAno").value;

        const filtrados = dadosCompletos.filter(d => {
            if (!d.vigencia_inicio) return false;
            const dataV = new Date(d.vigencia_inicio + "T00:00:00");
            return (mes === "all" || dataV.getMonth() == mes) && dataV.getFullYear() == ano;
        });

        // Atualiza KPIs
        document.getElementById("kpiVagas").textContent = filtrados.reduce((acc, curr) => acc + (parseInt(curr.vagas) || 0), 0);
        document.getElementById("kpiProf").textContent = [...new Set(filtrados.map(d => d.profissional))].length;

        // Atualiza Tabela
        const tbody = document.querySelector("#tabEscalas tbody");
        tbody.innerHTML = filtrados.map(d => `
            <tr style="border-bottom: 1px solid #f9f9f9;">
                <td style="padding:10px;">${d.profissional}</td>
                <td>${d.procedimento}</td>
                <td>${d.dias_semana}</td>
                <td>${d.vagas}</td>
                <td>${d.vigencia_inicio}</td>
            </tr>
        `).join('') || "<tr><td colspan='5' style='text-align:center; padding:20px;'>Sem dados.</td></tr>";

        renderizarGraficos(filtrados);
    }

    function renderizarGraficos(dados) {
        const profMap = {};
        dados.forEach(d => profMap[d.profissional] = (profMap[d.profissional] || 0) + (parseInt(d.vagas) || 0));

        // Gráfico Profissionais
        if(charts.p) charts.p.destroy();
        charts.p = new Chart(document.getElementById('chartProf'), {
            type: 'bar',
            data: { labels: Object.keys(profMap), datasets: [{ label: 'Vagas', data: Object.values(profMap), backgroundColor: '#1a2a6c' }]},
            options: { indexAxis: 'y', responsive: true }
        });
    }

    function popularFiltros() {
        // Lógica para carregar profissionais no select se desejar
    }

    // ==========================================
    // EVENTOS E INICIALIZAÇÃO
    // ==========================================
    document.getElementById("txtUnidade").textContent = UNIDADE;
    document.getElementById("btnSincronizar").onclick = sincronizarDados;
    document.getElementById("btnLogout").onclick = () => {
        if(confirm("Deseja sair?")) {
            localStorage.removeItem("unidade_selecionada");
            window.location.href = "index.html";
        }
    };
    
    document.getElementById("selMes").onchange = processarEExibir;
    document.getElementById("inpAno").oninput = processarEExibir;

    // INÍCIO: Apenas lê o cache, não vai ao servidor.
    carregarCreditos();
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if (cache) {
        dadosCompletos = JSON.parse(cache);
        processarEExibir();
    }
});
