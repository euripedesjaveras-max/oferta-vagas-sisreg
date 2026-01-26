/* Configurações Iniciais e Variáveis Globais */
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const CACHE_KEY = `cache_${UNIDADE}`;

    document.getElementById("txtUnidade").textContent = UNIDADE;

    /* Carregar Créditos do Sistema */
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema} | ${c.desenvolvedor}</p>`;
    }).catch(() => {});

    /* Funções de Formatação (Fidelidade aos dados do Sheets) */
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

    /* Função para Renderizar a Tabela no HTML */
    function renderizarDados(dados) {
        const tbody = document.getElementById("corpoTabela");
        if (!tbody) return;
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px;'>Nenhum dado encontrado para esta unidade.</td></tr>";
            return;
        }

        tbody.innerHTML = dados.map(item => {
            // Normalizar chaves para minúsculo para evitar conflitos de nomeclatura
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            return `
                <tr>
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
    }

    /* Ação do Botão Sincronizar (Busca API e Cache Local) */
    document.getElementById("btnSincronizar").onclick = async function() {
        this.innerHTML = "⌛ Sincronizando...";
        this.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();

            if (res.status === "OK") {
                // Persistência: Salva no navegador para acesso offline/rápido
                localStorage.setItem(CACHE_KEY, JSON.stringify(res.dados));
                renderizarDados(res.dados);
                alert("Dados sincronizados e salvos com sucesso!");
            } else {
                alert("Erro: " + (res.message || "Falha ao obter dados."));
            }
        } catch (e) {
            alert("Erro de conexão com o Google Sheets.");
            console.error(e);
        } finally {
            this.innerHTML = "🔄 Sincronizar Sheets";
            this.disabled = false;
        }
    };

    /* Controle de Acesso (Logout) */
    document.getElementById("btnLogout").onclick = () => {
        localStorage.clear();
        window.location.href = "index.html";
    };

    /* Inicialização: Carregar dados salvos ao abrir a página */
    const dadosSalvos = localStorage.getItem(CACHE_KEY);
    if (dadosSalvos) {
        renderizarDados(JSON.parse(dadosSalvos));
    }
});
