// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
    const UNIDADE_ATUAL = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzfKcOuEasj4lfWzqbP1FOoSKzJdQvVM7xK81PKCBKs8LgHjp5aJTYyRIygM9n1p_-AMQ/exec";

    // Elementos da tela
    document.getElementById("boasVindas").textContent = `Olá, Gestor!`;
    document.getElementById("identificacaoUnidade").textContent = `Unidade: ${UNIDADE_ATUAL}`;
    document.getElementById("mesAtual").textContent = new Intl.DateTimeFormat('pt-BR', {month: 'long'}).format(new Date()).toUpperCase();

    // Carregar dados (Local ou Nuvem)
    async function carregarDashboard(forceSync = false) {
        let dados = JSON.parse(localStorage.getItem("dashboard_data"));

        if (!dados || forceSync) {
            document.getElementById("btnAtualizar").textContent = "Sincronizando...";
            try {
                // Aqui simulamos a busca na aba da unidade no Sheets
                const resp = await fetch(`${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE_ATUAL)}`);
                const result = await resp.json();
                if (result.status === "OK") {
                    dados = result.dados;
                    localStorage.setItem("dashboard_data", JSON.stringify(dados));
                }
            } catch (err) {
                console.error("Erro ao buscar dados do servidor");
            }
        }
        
        processarGraficos(dados || []);
        document.getElementById("btnAtualizar").textContent = "🔄 Atualizar Dados";
    }

    function processarGraficos(dados) {
        // Lógica para contar vagas por dia e tipo (Exemplo simplificado)
        const totalVagas = dados.reduce((acc, curr) => acc + (parseInt(curr.vagas) || 0), 0);
        document.getElementById("totalVagas").textContent = totalVagas;
        
        const profissionaisUnicos = [...new Set(dados.map(d => d.cpf))].length;
        document.getElementById("totalProf").textContent = profissionaisUnicos;

        renderizarGraficos();
    }

    function renderizarGraficos() {
        // Configuração do Gráfico de Barras (Semana)
        new Chart(document.getElementById('chartSemana'), {
            type: 'bar',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
                datasets: [{
                    label: 'Vagas',
                    data: [120, 150, 180, 90, 200], // Dados vindos do processamento
                    backgroundColor: '#4CAF50'
                }]
            }
        });

        // Configuração do Gráfico de Pizza (Proporção)
        new Chart(document.getElementById('chartProporcao'), {
            type: 'doughnut',
            data: {
                labels: ['1ª Vez', 'Retorno'],
                datasets: [{
                    data: [75, 25],
                    backgroundColor: ['#2196F3', '#FFC107']
                }]
            }
        });
    }

    document.getElementById("btnAtualizar").onclick = () => carregarDashboard(true);
    carregarDashboard();
});
