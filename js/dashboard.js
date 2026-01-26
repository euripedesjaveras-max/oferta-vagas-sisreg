// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzfKcOuEasj4lfWzqbP1FOoSKzJdQvVM7xK81PKCBKs8LgHjp5aJTYyRIygM9n1p_-AMQ/exec";
  const UNIDADE_LOGADA = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
  
  // Elementos da Interface
  const txtBoasVindas = document.getElementById("txtBoasVindas");
  const txtUnidade = document.getElementById("txtUnidade");
  const btnAtualizar = document.getElementById("btnAtualizar");
  
  // 1. Identificação da Unidade
  txtBoasVindas.textContent = `Olá, Gestor da Unidade`;
  txtUnidade.textContent = UNIDADE_LOGADA;

  // 2. Carregamento Inteligente (Cache Local)
  async function carregarDados(forceSync = false) {
    let dados = JSON.parse(localStorage.getItem(`cache_dash_${UNIDADE_LOGADA}`));

    if (!dados || forceSync) {
      btnAtualizar.textContent = "⌛ Sincronizando...";
      btnAtualizar.disabled = true;

      try {
        const resp = await fetch(`${GOOGLE_SHEETS_URL}?unidade=${encodeURIComponent(UNIDADE_LOGADA)}`);
        const result = await resp.json();
        
        if (result.status === "OK") {
          dados = result.dados;
          localStorage.setItem(`cache_dash_${UNIDADE_LOGADA}`, JSON.stringify(dados));
          document.getElementById("kpiStatus").textContent = "Nuvem Ok";
        }
      } catch (err) {
        console.error("Erro ao conectar ao Sheets");
        document.getElementById("kpiStatus").textContent = "Offline";
      }
    } else {
      document.getElementById("kpiStatus").textContent = "Local (Cache)";
    }

    renderizarDashboard(dados || []);
    btnAtualizar.textContent = "🔄 Atualizar Servidor";
    btnAtualizar.disabled = false;
  }

  function renderizarDashboard(dados) {
    // Cálculo dos KPIs
    const totalVagas = dados.reduce((acc, item) => acc + (parseInt(item.vagas) || 0), 0);
    const totalProf = [...new Set(dados.map(item => item.cpf))].length;

    document.getElementById("kpiVagas").textContent = totalVagas;
    document.getElementById("kpiProf").textContent = totalProf;

    // Preparação dos Gráficos (Baseado na análise dos seus arquivos)
    montarGraficoSemana(dados);
    montarGraficoPizza(dados);
  }

  function montarGraficoSemana(dados) {
    const ctx = document.getElementById('chartSemana').getContext('2d');
    // Destruir gráfico anterior se existir para evitar sobreposição
    if (window.chart1) window.chart1.destroy();

    window.chart1 = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
        datasets: [{
          label: 'Vagas Ofertadas',
          data: [65, 85, 40, 110, 95], // Aqui entraria a soma real por dia
          backgroundColor: '#4e73df',
          borderRadius: 5
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  function montarGraficoPizza(dados) {
    const ctx = document.getElementById('chartCotas').getContext('2d');
    if (window.chart2) window.chart2.destroy();

    window.chart2 = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['SISREG (75%)', 'AGHU (25%)'],
        datasets: [{
          data: [75, 25], // Proporção extraída dos seus anexos
          backgroundColor: ['#1cc88a', '#f6c23e']
        }]
      },
      options: { responsive: true }
    });
  }

  btnAtualizar.onclick = () => carregarDados(true);
  
  // Início padrão
  carregarDados();
});
