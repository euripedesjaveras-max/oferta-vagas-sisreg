// js/dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";

    // Carregar Créditos
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if(f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema} | ${c.desenvolvedor}</p>`;
    }).catch(() => {});

    document.getElementById("txtUnidade").textContent = UNIDADE;

    // Funções de Limpeza de Dados
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

    // Função para Preencher a Tabela
    function popularTabela(dados) {
        const tbody = document.querySelector("#tabEscalas tbody");
        if (!tbody) return;
        tbody.innerHTML = ""; 

        if (dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px;'>Nenhum registro encontrado.</td></tr>";
            return;
        }

        dados.forEach(item => {
            const d = {};
            for (let k in item) { d[k.toLowerCase().trim()] = item[k]; }

            const tr = document.createElement("tr");
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
    }

    // Botão Sincronizar
    document.getElementById("btnSincronizar").onclick = async function() {
        const originalText = this.innerHTML;
        this.innerHTML = "⌛ Aguarde...";
        this.disabled = true;

        try {
            const resp = await fetch(`${URL_API}?unidade=${encodeURIComponent(UNIDADE)}&t=${Date.now()}`);
            const res = await resp.json();

            if (res.status === "OK") {
                localStorage.setItem(`cache_${UNIDADE}`, JSON.stringify(res.dados));
                popularTabela(res.dados);
            } else {
                alert("Erro ao carregar dados: " + res.message);
            }
        } catch (e) {
            alert("Erro de conexão com o Sheets.");
        } finally {
            this.innerHTML = originalText;
            this.disabled = false;
        }
    };

    // Logout
    document.getElementById("btnLogout").onclick = () => {
        localStorage.clear();
        window.location.href = "index.html";
    };

    // Carga inicial
    const cache = localStorage.getItem(`cache_${UNIDADE}`);
    if (cache) {
        popularTabela(JSON.parse(cache));
    }
});
