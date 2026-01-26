/* [LOGICA] Inicializacao e Variaveis de Ambiente */
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const CACHE_KEY = `cache_${UNIDADE}`;

    document.getElementById("txtUnidade").textContent = UNIDADE;

    /* [LOGICA] Carregar Creditos do config.json */
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema} | ${c.desenvolvedor}</p>`;
    }).catch(() => {});

    /* [LOGICA] Funcoes de Formatacao de Dados */
    function formatarHora(valor) {
        if (!valor) return '';
        if (typeof valor === "string" && valor.includes('T')) return valor.split('T')[1].substring(0, 5);
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

    /* [LOGICA] Funcao de Filtro Mensal */
    function filtrarTabela() {
        const mesSelecionado = document.getElementById("filtroMes").value;
        const linhas = document.querySelectorAll("#corpoTabela tr");

        linhas.forEach(linha => {
            const dataVigencia = linha.getAttribute("data-mes"); // Pega o mês guardado no atributo da linha
            if (mesSelecionado === "todos" || dataVigencia === mesSelecionado) {
                linha.style.display = ""; // Mostra
            } else {
                linha.style.display = "none"; // Esconde
            }
        });
    }

    /* [LOGICA] Funcao para Gerar o HTML da Tabela Dinamicamente */
    function renderizarDados(dados) {
        const tbody = document.getElementById("corpoTabela");
        if (!tbody) return;
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px;'>Nenhum dado encontrado.</td></tr>";
            return;
        }

        tbody.innerHTML = dados.map(item => {
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            // Extração do mês para o filtro (assume formato ISO do Sheets YYYY-MM-DD)
            const mesISO = d.vigencia_inicio ? d.vigencia_inicio.split('-')[1] : "";

            return `
                <tr data-mes="${mesISO}">
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
                </tr>
            `;
        }).join('');
        
        // Aplica o filtro atual logo após renderizar (caso o usuário já tenha selecionado um mês)
        filtrarTabela();
    }

    /* [LOGICA] Eventos de Interação */
    document.getElementById("filtroMes").addEventListener("change", filtrarTabela);

    document.getElementById("btnSincronizar").onclick = async function() {
        this.innerHTML = "⌛ Sincronizando...";
        this.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();

            if (res.status === "OK") {
                localStorage.setItem(CACHE_KEY, JSON.stringify(res.dados));
                renderizarDados(res.dados);
                alert("Sincronizado!");
            }
        } catch (e) {
            alert("Erro de conexão.");
        } finally {
            this.innerHTML = "🔄 Sincronizar Sheets";
            this.disabled = false;
        }
    };

    /* [LOGICA] Controle de Logout */
    document.getElementById("btnLogout").onclick = () => {
        localStorage.clear();
        window.location.href = "index.html";
    };

    /* [INICIALIZACAO] Carregar Cache Local */
    const dadosSalvos = localStorage.getItem(CACHE_KEY);
    if (dadosSalvos) {
        renderizarDados(JSON.parse(dadosSalvos));
    }
});
