// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";

    // Carregar Créditos do config.json
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema}</p><p>${c.desenvolvedor} • ${c.detalhes}</p>`;
    }).catch(() => console.warn("config.json não encontrado."));

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // Funções de Formatação para limpeza visual (Mantendo fidelidade ao Sheets)
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

    // Função para Popular a Tabela
    function popularTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        if (!tbody) return;
        tbody.innerHTML = ""; 

        dados.forEach(item => {
            // Normaliza chaves para evitar erros de case-sensitive
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            const tr = document.createElement("tr");
            tr.className = "linha-dados";
            
            // Grava o atributo de vigência original para o filtro de data funcionar
            tr.setAttribute("data-vigencia", d.vigencia_inicio || "");

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

        aplicarFiltros(); 
    }

    // Lógica de Filtro Automático
    function aplicarFiltros() {
        const mesSel = document.getElementById("selMes").value;
        const anoSel = document.getElementById("inpAno").value;
        const linhas = document.querySelectorAll(".linha-dados");

        linhas.forEach(tr => {
            const dataISO = tr.getAttribute("data-vigencia");
            if (!dataISO) {
                tr.style.display = "none";
                return;
            }

            // Converte a string de data do Sheets para objeto Date
            const dataObj = new Date(dataISO + (dataISO.includes('T') ? '' : 'T00:00:00'));

            const matchMes = (mesSel === "all") || (dataObj.getMonth() == mesSel);
            const matchAno = (anoSel === "") || (dataObj.getFullYear() == anoSel);

            tr.style.display = (matchMes && matchAno) ? "" : "none";
        });
    }

    // Botão Sincronizar
    document.getElementById("btnSincronizar").onclick = async function() {
        this.textContent = "⌛ Sincronizando...";
        this.disabled = true;
        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();
            if (res.status === "OK") {
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(res.dados));
                popularTabela(res.dados);
                alert("Dados sincronizados com sucesso!");
            } else {
                alert("Erro ao obter dados.");
            }
        } catch (e) {
            alert("Erro de conexão com o Sheets.");
        } finally {
            this.textContent = "🔄 Sincronizar Sheets";
            this.disabled = false;
        }
    };

    // Eventos de Filtro Automático
    document.getElementById("selMes").addEventListener("change", aplicarFiltros);
    document.getElementById("inpAno").addEventListener("input", aplicarFiltros);

    // Logout
    document.getElementById("btnLogout").onclick = () => {
        localStorage.clear();
        window.location.href = "index.html";
    };

    // Carga Inicial via Cache
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if(cache) {
        popularTabela(JSON.parse(cache));
    }
});
