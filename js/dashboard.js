/* [LOGICA] Inicializacao e Variaveis de Ambiente */
document.addEventListener("DOMContentLoaded", () => {
    const URL_API = "https://script.google.com/macros/s/AKfycbzrzuSOFKgHFbLpjKOpGqzK7gAAIK3ucbDYgsTvDi1RoFcClepilJwRtF0GTFteOFjfBQ/exec";
    const UNIDADE = localStorage.getItem("unidade_selecionada") || "AGENDA TESTE";
    const CACHE_KEY = `cache_${UNIDADE}`;

    document.getElementById("txtUnidade").textContent = UNIDADE;

    /* [LOGICA] Carregar Creditos do config.json */
    fetch("data/config.json").then(r => r.json()).then(c => {
        const f = document.getElementById("footerCreditos");
        if (f) f.innerHTML = `<p>© ${c.ano} - ${c.sistema} | ${c.desenvolvedor}</p>`;
    }).catch(() => {});

    /* ============================================================
       [NOVO - SUPORTE] Cores via theme.css (evita hardcode)
       ============================================================ */
    // [NOVO]
    function cssVar(name, fallback) { // [NOVO]
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }
    // [NOVO]
    const COLORS = { // [NOVO]
        blue: cssVar("--am-blue", "#1a2a6c"),
        red: cssVar("--am-red", "#b21f1f"),
        yellow: cssVar("--am-yellow", "#fdbb2d"),
        green: cssVar("--am-green", "#4CAF50"),
        gray: "#9aa0a6"
    };

    /* ============================================================
       [NOVO - SUPORTE] Normalizacao robusta do payload do Sheets
       ============================================================ */
    // [NOVO]
    function normalizarItem(item) {
        const d = {};
        for (let k in item) d[String(k).toLowerCase().trim()] = item[k];

        // Mapas defensivos (caso algum header venha diferente)
        const out = {
            cpf: d.cpf ?? d["cpf do profissional"] ?? d["cpf_profissional"] ?? "",
            profissional: d.profissional ?? d["nome do profissional"] ?? d["nome_profissional"] ?? "",
            cod_procedimento: d.cod_procedimento ?? d["cod. procedimento"] ?? d["cod procedimento"] ?? d["cod_procedimento"] ?? d["cod-procedimento"] ?? "",
            procedimento: d.procedimento ?? d["descricao do procedimento"] ?? d["descrição do procedimento"] ?? "",
            exames: d.exames ?? "",
            dias_semana: d.dias_semana ?? d["dias"] ?? d["dias da semana"] ?? "",
            hora_inicio: d.hora_inicio ?? d["hora_inicio"] ?? d["hora entrada"] ?? d["hora de entrada"] ?? "",
            hora_fim: d.hora_fim ?? d["hora_fim"] ?? d["hora saida"] ?? d["hora de saída"] ?? "",
            vagas: d.vagas ?? 0,
            vigencia_inicio: d.vigencia_inicio ?? d["vigência inicial"] ?? d["vigencia inicial"] ?? "",
            vigencia_fim: d.vigencia_fim ?? d["vigência final"] ?? d["vigencia final"] ?? ""
        };

        // Normaliza strings
        Object.keys(out).forEach(k => {
            if (typeof out[k] === "string") out[k] = out[k].trim();
        });

        // Garante número
        out.vagas = Number(out.vagas) || 0;

        return out;
    }

    // [NOVO]
    function normalizarLista(lista) {
        if (!Array.isArray(lista)) return [];
        return lista.map(normalizarItem);
    }

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

    /* [NOVO] Calcula o total de vagas considerando: vagas * ocorrências dos dias na vigência */
    function calcularTotalVagasPorVigencia(dados) {
        if (!Array.isArray(dados) || dados.length === 0) return 0;
    
        // Normaliza "dias_semana" para um Set de dias (0=DOM ... 6=SAB)
        function extrairDiasDaSemana(diasStr) {
            const s = String(diasStr || "").toUpperCase();
    
            // Aceita variações comuns: SEG, TER, QUA, QUI, SEX, SAB, DOM
            // e também textos longos (SEGUNDA, TERCA/TERÇA, QUARTA...)
            const mapa = [
                { re: /\bDOM(INGO)?\b/g, idx: 0 },
                { re: /\bSEG(UNDA)?\b/g, idx: 1 },
                { re: /\bTER(CA|ÇA|CEIRA)?\b/g, idx: 2 },
                { re: /\bQUA(RTA)?\b/g, idx: 3 },
                { re: /\bQUI(NTA)?\b/g, idx: 4 },
                { re: /\bSEX(TA)?\b/g, idx: 5 },
                { re: /\bS[ÁA]B(ADO)?\b|\bSAB(ADO)?\b/g, idx: 6 },
            ];
    
            const set = new Set();
            mapa.forEach(m => { if (m.re.test(s)) set.add(m.idx); });
            return set;
        }
    
        // Converte "YYYY-MM-DD" (ou "YYYY-MM-DDTHH...") em Date local (meia-noite)
        function parseDataISO(valor) {
            if (!valor) return null;
            const v = String(valor).split("T")[0]; // mantém só data
            const p = v.split("-");
            if (p.length !== 3) return null;
            const y = Number(p[0]), m = Number(p[1]), d = Number(p[2]);
            if (!y || !m || !d) return null;
            return new Date(y, m - 1, d);
        }
    
        // Conta quantas vezes os dias (Set de 0-6) ocorrem entre inicio e fim (inclusive)
        function contarOcorrenciasDias(inicio, fim, diasSet) {
            if (!inicio || !fim || !(diasSet instanceof Set) || diasSet.size === 0) return 0;
    
            // Garante ordem
            let start = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
            let end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
            if (start > end) { const tmp = start; start = end; end = tmp; }
    
            // Itera dia a dia (intervalos pequenos/médios isso é ok e simples/seguro)
            let count = 0;
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                if (diasSet.has(dt.getDay())) count++;
            }
            return count;
        }
    
        let totalGeral = 0;
    
        dados.forEach(item => {
            // Normalização das chaves (igual seu padrão)
            const d = {};
            for (let k in item) d[k.toLowerCase().trim()] = item[k];
    
            const vagas = Number(d.vagas) || 0;
            if (vagas <= 0) return;
    
            const diasSet = extrairDiasDaSemana(d.dias_semana);
            const inicio = parseDataISO(d.vigencia_inicio);
            const fim = parseDataISO(d.vigencia_fim);
            if (!inicio || !fim || diasSet.size === 0) return;
    
            const ocorrencias = contarOcorrenciasDias(inicio, fim, diasSet);
            const totalLinha = vagas * ocorrencias;
    
            totalGeral += totalLinha;
        });
    
        return totalGeral;
    }


    /* ============================================================
       [NOVO - SUPORTE] Datas ISO (para linha de vigência)
       ============================================================ */
    // [NOVO]
    function parseDataISO(v) {
        if (!v) return null;
        if (typeof v !== "string") return null;
        const s = v.includes("T") ? v.split("T")[0] : v;
        // aceita YYYY-MM-DD
        const dt = new Date(s + "T00:00:00");
        return isNaN(dt.getTime()) ? null : dt;
    }

    /* ============================================================
       [NOVO - SUPORTE] Classificacao (para donut + linha)
       ============================================================ */
    // [NOVO]
    function tipoProcedimento(txt) {
        const t = String(txt || "").toUpperCase();
        if (t.includes("RETORNO")) return "RETORNO";
        if (t.startsWith("GRUPO") || t.includes("GRUPO")) return "GRUPO";
        if (t.includes("EXAME")) return "EXAME";
        if (t.includes("CONSULTA")) return "CONSULTA";
        return "OUTROS";
    }

    // [NOVO]
    function extrairDias(diasTxt) {
        const s = String(diasTxt || "").toUpperCase();
        const tokens = s.split(/[\s,;\/]+/).filter(Boolean);
        const valid = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
        return tokens.filter(t => valid.includes(t));
    }

    /* [LOGICA] Funcao para Atualizar os Cards (KPIs) - CORRECAO % RETORNO */
    function atualizarCards(dadosFiltrados) {
        const kpiVagas = document.getElementById("kpiVagas");
        const kpiProfs = document.getElementById("kpiProfissionais");
        const kpiMedia = document.getElementById("kpiMedia");
        const kpiLider = document.getElementById("kpiLider");
        const kpiRetorno = document.getElementById("kpiRetorno");
        const kpiProcedimentos = document.getElementById("kpiProcedimentos");

        if (!dadosFiltrados || dadosFiltrados.length === 0) {
            if (kpiVagas) kpiVagas.textContent = "0";
            if (kpiProfs) kpiProfs.textContent = "0";
            if (kpiMedia) kpiMedia.textContent = "0";
            if (kpiLider) kpiLider.textContent = "-";
            if (kpiRetorno) kpiRetorno.textContent = "0%";
            if (kpiProcedimentos) kpiProcedimentos.textContent = "0";
            return;
        }

        let totalVagas = 0;
        let vagasRetorno = 0;
        const cpfs = new Set();
        const procsUnicos = new Set();
        const contagemProcs = {};

        dadosFiltrados.forEach(item => {
            // Normalização das chaves para garantir leitura
            const d = {};
            for (let k in item) {
                d[k.toLowerCase().trim()] = item[k];
            }

            // Soma de Vagas
            // [NOVO] Total de vagas considerando vigência e dias
            totalVagas = calcularTotalVagasPorVigencia(dadosFiltrados);


            // BUSCA DE RETORNO (Mais abrangente)
            const campoProc = String(d.procedimento || "").toUpperCase().trim();
            const campoExame = String(d.exames || "").toUpperCase().trim();

            if (campoProc.toUpperCase().includes("RETORNO") ||
                campoExame.toUpperCase().includes("RETORNO")
            ) {
                vagasRetorno += qtdVagas;
            }

            if (d.cpf) cpfs.add(d.cpf);
            if (d.procedimento) {
                procsUnicos.add(d.procedimento.trim());
                contagemProcs[d.procedimento.trim()] = (contagemProcs[d.procedimento.trim()] || 0) + 1;
            }
        });

        // Cálculos
        const nProfs = cpfs.size;
        const nProcs = procsUnicos.size;
        const media = nProfs > 0 ? (totalVagas / nProfs).toFixed(1) : 0;

        // % de Retorno arredondado
        const percRetorno = totalVagas > 0 ? Math.round((vagasRetorno / totalVagas) * 100) : 0;

        // Encontrar o Líder
        let liderNome = "-";
        const chaves = Object.keys(contagemProcs);
        if (chaves.length > 0) {
            liderNome = chaves.reduce((a, b) => contagemProcs[a] > contagemProcs[b] ? a : b);
        }

        // Atualização da UI
        if (kpiVagas) kpiVagas.textContent = totalVagas;
        if (kpiProfs) kpiProfs.textContent = nProfs;
        if (kpiMedia) kpiMedia.textContent = media;
        if (kpiProcedimentos) kpiProcedimentos.textContent = nProcs;
        if (kpiLider) kpiLider.textContent = liderNome;
        if (kpiRetorno) kpiRetorno.textContent = percRetorno + "%";
    }

    /* =====================================================================
       [FASE 3/4] GRAFICOS + INSIGHTS (corrigidos e completos)
       ===================================================================== */

    let charts = {}; // [FASE 3/4] Armazena instancias para evitar sobreposicao

    // [NOVO]
    function safeCanvas(id) {
        const el = document.getElementById(id);
        return el ? el : null;
    }

    /* [FASE 3/4] Funcao principal para atualizar TODOS os graficos */
    function atualizarGraficos(dadosRaw) {
        const dados = normalizarLista(dadosRaw); // [NOVO] garante chaves consistentes
        gerarHeatmap(dados);
        gerarFunil(dados);
        gerarRadar(dados);
        gerarBolhas(dados);
        gerarDonut(dados);
        gerarLinhaVigencia(dados);
        gerarInsights(dados);
    }

    /* ============================================================
       [GRAFICO 1] Heatmap Dia x Horario (bubble com densidade)
       ============================================================ */
    function gerarHeatmap(dados) {
        const c = safeCanvas("chartHeatmap");
        if (!c) return;

        if (charts.heatmap) charts.heatmap.destroy();

        const dias = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
        const idxDia = Object.fromEntries(dias.map((d,i)=>[d,i]));

        // agrega (dia,hora) -> vagas
        const mapa = new Map();
        dados.forEach(d => {
            const diasSel = extrairDias(d.dias_semana);
            const h0 = parseInt(String(formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
            diasSel.forEach(di => {
                const key = `${di}|${h0}`;
                mapa.set(key, (mapa.get(key) || 0) + (Number(d.vagas) || 0));
            });
        });

        const pontos = [];
        let maxV = 1;
        mapa.forEach(v => { if (v > maxV) maxV = v; });

        mapa.forEach((v, key) => {
            const [di, h] = key.split("|");
            const x = idxDia[di];
            const y = Number(h);
            pontos.push({
                x, y,
                r: Math.max(6, Math.round((v / maxV) * 18)),
                _v: v,
                _dia: di,
                _h: y
            });
        });

        charts.heatmap = new Chart(c, {
            type: "bubble",
            data: {
                datasets: [{
                    label: "Intensidade",
                    data: pontos,
                    backgroundColor: (ctx) => {
                        const raw = ctx.raw;
                        const v = raw && raw._v ? raw._v : 0;
                        const a = maxV ? Math.min(0.95, 0.15 + (v / maxV) * 0.8) : 0.4;
                        return `rgba(253,187,45,${a})`;
                    },
                    borderColor: "rgba(0,0,0,0.06)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const r = ctx.raw || {};
                                return `${r._dia} ${String(r._h).padStart(2,"0")}:00 • ${r._v || 0} vagas`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: -0.5,
                        max: 6.5,
                        ticks: { callback: (v) => dias[v] || "" },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { callback: (v) => `${String(v).padStart(2,"0")}:00` },
                        title: { display: true, text: "Hora (início)" }
                    }
                }
            }
        });
    }

    /* ============================================================
       [GRAFICO 2] Funil (estilo “distribuição”)
       ============================================================ */
    function gerarFunil(dados) {
        const c = safeCanvas("chartFunil");
        if (!c) return;

        if (charts.funil) charts.funil.destroy();

        const totalEscalas = dados.length;
        const profs = new Set(dados.map(d => d.cpf).filter(Boolean)).size;
        const procs = new Set(dados.map(d => `${d.cod_procedimento}|${d.procedimento}`)).size;

        let vagasRetorno = 0;
        dados.forEach(d => {
            const isRet = tipoProcedimento(d.procedimento) === "RETORNO" || String(d.exames||"").toUpperCase().includes("RETORNO");
            if (isRet) vagasRetorno += Number(d.vagas) || 0;
        });

        charts.funil = new Chart(c, {
            type: "bar",
            data: {
                labels: ["Escalas Ativas", "Profissionais", "Procs. Únicos", "Retornos (vagas)"],
                datasets: [{
                    label: "Distribuição",
                    data: [totalEscalas, profs, procs, vagasRetorno],
                    backgroundColor: [COLORS.blue, COLORS.green, COLORS.yellow, COLORS.red],
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    /* ============================================================
       [GRAFICO 3] Radar “Perfil da Unidade” (métricas normalizadas)
       ============================================================ */
    function gerarRadar(dados) {
        const c = safeCanvas("chartRadar");
        if (!c) return;

        if (charts.radar) charts.radar.destroy();

        const totalVagas = dados.reduce((s, d) => s + (Number(d.vagas) || 0), 0);
        const profs = new Set(dados.map(d => d.cpf).filter(Boolean)).size;
        const procs = new Set(dados.map(d => `${d.cod_procedimento}|${d.procedimento}`)).size;

        let retornoV = 0;
        const diasSet = new Set();
        let horasAprox = 0;

        dados.forEach(d => {
            const t = tipoProcedimento(d.procedimento);
            if (t === "RETORNO" || String(d.exames||"").toUpperCase().includes("RETORNO")) retornoV += (Number(d.vagas) || 0);
            extrairDias(d.dias_semana).forEach(x => diasSet.add(x));

            const hi = parseInt(String(formatarHora(d.hora_inicio) || "0").split(":")[0] || "0", 10);
            const hf = parseInt(String(formatarHora(d.hora_fim) || "0").split(":")[0] || "0", 10);
            if (!isNaN(hi) && !isNaN(hf) && hf >= hi) horasAprox += (hf - hi);
        });

        const percRetorno = totalVagas > 0 ? Math.round((retornoV / totalVagas) * 100) : 0;
        const mediaV = profs > 0 ? (totalVagas / profs) : 0;

        // normalizações simples para radar (0-100)
        const clamp100 = (x) => Math.max(0, Math.min(100, x));
        const v1 = clamp100(totalVagas);                      // escala livre (pode passar, clamp segura)
        const v2 = clamp100(percRetorno);                    // % já 0-100
        const v3 = clamp100(profs * 10);                     // 10 profs => 100
        const v4 = clamp100(procs * 5);                      // 20 procs => 100
        const v5 = clamp100(diasSet.size * 15);              // 7 dias => 105
        const v6 = clamp100(mediaV * 10);                    // média 10 => 100
        const v7 = clamp100(horasAprox);                     // horas já acumuladas (clamp)

        charts.radar = new Chart(c, {
            type: "radar",
            data: {
                labels: ["Volume (vagas)", "% Retorno", "Profissionais", "Procs. Únicos", "Cobertura (dias)", "Média vagas/prof", "Carga horária"],
                datasets: [{
                    label: "Perfil da Unidade",
                    data: [v1, v2, v3, v4, v5, v6, v7],
                    backgroundColor: "rgba(26,42,108,0.20)",
                    borderColor: COLORS.blue,
                    pointBackgroundColor: COLORS.yellow,
                    pointBorderColor: COLORS.blue
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
            }
        });
    }

    /* ============================================================
       [GRAFICO 4] Bolhas “Profissionais por Impacto”
       x = dia mais frequente | y = vagas | r = diversidade de procs
       ============================================================ */
    function gerarBolhas(dados) {
        const c = safeCanvas("chartBolhas");
        if (!c) return;

        if (charts.bolhas) charts.bolhas.destroy();

        const dias = ["DOM","SEG","TER","QUA","QUI","SEX","SAB"];
        const idxDia = Object.fromEntries(dias.map((d,i)=>[d,i]));

        const mapa = {}; // cpf -> stats
        dados.forEach(d => {
            const cpf = d.cpf || "(sem cpf)";
            if (!mapa[cpf]) mapa[cpf] = { nome: d.profissional || cpf, vagas: 0, procs: new Set(), diasCount: {} };

            mapa[cpf].vagas += Number(d.vagas) || 0;
            mapa[cpf].procs.add(`${d.cod_procedimento}|${d.procedimento}`);

            extrairDias(d.dias_semana).forEach(di => {
                mapa[cpf].diasCount[di] = (mapa[cpf].diasCount[di] || 0) + (Number(d.vagas) || 0);
            });
        });

        const pontos = [];
        const nomes = [];

        Object.keys(mapa).forEach((cpf, i) => {
            const st = mapa[cpf];
            let topDia = "SEG";
            let topV = -1;
            Object.keys(st.diasCount).forEach(di => {
                if (st.diasCount[di] > topV) { topV = st.diasCount[di]; topDia = di; }
            });

            nomes.push(st.nome);

            pontos.push({
                x: idxDia[topDia] ?? 1,
                y: st.vagas,
                r: Math.max(8, Math.round(st.procs.size * 2)),
                _nome: st.nome,
                _cpf: cpf,
                _dia: topDia,
                _procs: st.procs.size,
                _v: st.vagas
            });
        });

        charts.bolhas = new Chart(c, {
            type: "bubble",
            data: {
                datasets: [{
                    label: "Profissionais",
                    data: pontos,
                    backgroundColor: "rgba(76,175,80,0.55)",
                    borderColor: "rgba(76,175,80,0.9)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const r = ctx.raw || {};
                                return `${r._nome} • ${r._v} vagas • ${r._procs} procs • pico: ${r._dia}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: -0.5, max: 6.5,
                        ticks: { callback: (v) => dias[v] || "" },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: "rgba(0,0,0,0.06)" }
                    }
                }
            }
        });
    }

    /* ============================================================
       [GRAFICO 5] Donut multi-anel
       - anel interno: tipo de procedimento
       - anel externo: distribuição por dia
       ============================================================ */
    function gerarDonut(dados) {
        const c = safeCanvas("chartDonut");
        if (!c) return;

        if (charts.donut) charts.donut.destroy();

        // interno: tipos
        const tipos = { "CONSULTA": 0, "GRUPO": 0, "RETORNO": 0, "EXAME": 0, "OUTROS": 0 };
        // externo: dias
        const diasMapa = { "DOM":0,"SEG":0,"TER":0,"QUA":0,"QUI":0,"SEX":0,"SAB":0 };

        dados.forEach(d => {
            const v = Number(d.vagas) || 0;
            tipos[tipoProcedimento(d.procedimento)] = (tipos[tipoProcedimento(d.procedimento)] || 0) + v;

            const diasSel = extrairDias(d.dias_semana);
            if (diasSel.length === 0) {
                // se não vier dia, joga em SEG (evita “sumir” no gráfico)
                diasMapa["SEG"] += v;
            } else {
                diasSel.forEach(di => diasMapa[di] += v);
            }
        });

        const labelsTipos = Object.keys(tipos);
        const valsTipos = labelsTipos.map(k => tipos[k]);

        const labelsDias = Object.keys(diasMapa);
        const valsDias = labelsDias.map(k => diasMapa[k]);

        charts.donut = new Chart(c, {
            type: "doughnut",
            data: {
                labels: labelsDias,
                datasets: [
                    {
                        label: "Tipos",
                        data: valsTipos,
                        backgroundColor: [COLORS.yellow, COLORS.green, COLORS.red, COLORS.blue, COLORS.gray],
                        borderWidth: 0,
                        radius: "55%",
                        cutout: "35%"
                    },
                    {
                        label: "Dias",
                        data: valsDias,
                        backgroundColor: [
                            "rgba(26,42,108,0.12)",
                            "rgba(26,42,108,0.18)",
                            "rgba(26,42,108,0.24)",
                            "rgba(26,42,108,0.30)",
                            "rgba(26,42,108,0.36)",
                            "rgba(26,42,108,0.42)",
                            "rgba(26,42,108,0.48)"
                        ],
                        borderWidth: 0,
                        radius: "95%",
                        cutout: "60%"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const lbl = ctx.label || "";
                                const v = ctx.parsed || 0;
                                return `${lbl}: ${v} vagas`;
                            }
                        }
                    }
                }
            }
        });
    }

    /* ============================================================
       [GRAFICO 6] Evolução da Vigência (linha por tipo + fill)
       ============================================================ */
    function gerarLinhaVigencia(dados) {
        const c = safeCanvas("chartLinha");
        if (!c) return;

        if (charts.linha) charts.linha.destroy();

        // agrupa por data (vigencia_inicio) e tipo
        const byDate = {}; // dateISO -> {TIPO: vagas}
        const tipos = ["CONSULTA","GRUPO","RETORNO","EXAME","OUTROS"];

        dados.forEach(d => {
            const dt = parseDataISO(d.vigencia_inicio);
            if (!dt) return;
            const key = dt.toISOString().split("T")[0];
            if (!byDate[key]) byDate[key] = { "CONSULTA":0,"GRUPO":0,"RETORNO":0,"EXAME":0,"OUTROS":0 };
            byDate[key][tipoProcedimento(d.procedimento)] += Number(d.vagas) || 0;
        });

        const labels = Object.keys(byDate).sort();
        const mk = (tipo, color) => ({
            label: tipo,
            data: labels.map(k => byDate[k][tipo] || 0),
            borderColor: color,
            backgroundColor: (ctx) => {
                const chart = ctx.chart;
                const { ctx: canvasCtx, chartArea } = chart;
                if (!chartArea) return "rgba(0,0,0,0)";
                const g = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                g.addColorStop(0, color.replace(")", ",0.25)").replace("rgb", "rgba"));
                g.addColorStop(1, color.replace(")", ",0.00)").replace("rgb", "rgba"));
                return g;
            },
            fill: true,
            tension: 0.35,
            pointRadius: 2
        });

        // cores em rgb para o gradient funcionar
        const cBlue = "rgb(26,42,108)";
        const cGreen = "rgb(76,175,80)";
        const cYellow = "rgb(253,187,45)";
        const cRed = "rgb(178,31,31)";
        const cGray = "rgb(154,160,166)";

        charts.linha = new Chart(c, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    mk("CONSULTA", cBlue),
                    mk("GRUPO", cGreen),
                    mk("RETORNO", cRed),
                    mk("EXAME", cYellow),
                    mk("OUTROS", cGray)
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" } }
                }
            }
        });
    }

    /* ============================================================
       [GRAFICO 7] Insights automáticos (estilo “Destaques”)
       ============================================================ */
    function gerarInsights(dados) {
        const ul = document.getElementById("listaInsights");
        if (!ul) return;

        ul.innerHTML = "";
        if (!dados || dados.length === 0) return;

        const totalVagas = dados.reduce((s, d) => s + (Number(d.vagas) || 0), 0);

        // Concentracao por dia
        const byDay = { "DOM":0,"SEG":0,"TER":0,"QUA":0,"QUI":0,"SEX":0,"SAB":0 };
        dados.forEach(d => {
            const v = Number(d.vagas) || 0;
            const dias = extrairDias(d.dias_semana);
            if (dias.length === 0) byDay["SEG"] += v;
            else dias.forEach(di => byDay[di] += v);
        });
        let topDay = "SEG";
        Object.keys(byDay).forEach(di => { if (byDay[di] > byDay[topDay]) topDay = di; });
        const percTopDay = totalVagas > 0 ? Math.round((byDay[topDay] / totalVagas) * 100) : 0;

        // Top 4 profissionais
        const byProf = {};
        dados.forEach(d => {
            const p = d.profissional || "(Sem nome)";
            byProf[p] = (byProf[p] || 0) + (Number(d.vagas) || 0);
        });
        const profOrdenado = Object.entries(byProf).sort((a,b)=>b[1]-a[1]);
        const top4 = profOrdenado.slice(0,4).reduce((s, x)=>s + x[1], 0);
        const percTop4 = totalVagas > 0 ? Math.round((top4 / totalVagas) * 100) : 0;

        // Retorno %
        let retornoV = 0;
        dados.forEach(d => {
            const isRet = tipoProcedimento(d.procedimento) === "RETORNO" || String(d.exames||"").toUpperCase().includes("RETORNO");
            if (isRet) retornoV += (Number(d.vagas) || 0);
        });
        const percRet = totalVagas > 0 ? Math.round((retornoV / totalVagas) * 100) : 0;

        // Procedimento campeão
        const byProc = {};
        dados.forEach(d => {
            const k = (d.procedimento || "OUTROS").trim();
            byProc[k] = (byProc[k] || 0) + (Number(d.vagas) || 0);
        });
        const procTop = Object.entries(byProc).sort((a,b)=>b[1]-a[1])[0];
        const procNome = procTop ? procTop[0] : "-";

        ul.innerHTML += `<li>📌 <strong>${topDay}</strong> concentra <strong>${percTopDay}%</strong> das vagas ofertadas.</li>`;
        ul.innerHTML += `<li>👥 Os <strong>4 principais profissionais</strong> respondem por <strong>${percTop4}%</strong> das vagas.</li>`;
        ul.innerHTML += `<li>🔁 <strong>Retornos</strong> representam <strong>${percRet}%</strong> das vagas.</li>`;
        ul.innerHTML += `<li>🏆 Procedimento líder: <strong>${procNome}</strong>.</li>`;
    }

    /* [LOGICA] Funcao de Filtro Mensal */
    function filtrarTabela() {
        const mesSelecionado = document.getElementById("filtroMes").value;
        const linhas = document.querySelectorAll("#corpoTabela tr");
        let dadosParaKPI = [];

        // Recuperar dados do cache para recalcular os cards baseado no que esta visivel
        const cache = normalizarLista(JSON.parse(localStorage.getItem(CACHE_KEY) || "[]")); // [NOVO] normaliza cache

        linhas.forEach((linha, index) => {
            const dataVigencia = linha.getAttribute("data-mes");
            if (mesSelecionado === "todos" || dataVigencia === mesSelecionado) {
                linha.style.display = "";
                if (cache[index]) dadosParaKPI.push(cache[index]);
            } else {
                linha.style.display = "none";
            }
        });

        // Se filtrar, os cards mostram apenas o resumo do mes selecionado
        atualizarCards(dadosParaKPI);
        atualizarGraficos(dadosParaKPI); // [FASE 3/4] CHAMADA
    }

    /* [LOGICA] Funcao para Gerar o HTML da Tabela Dinamicamente */
    function renderizarDados(dadosRaw) {
        const tbody = document.getElementById("corpoTabela");
        if (!tbody) return;

        const dados = normalizarLista(dadosRaw); // [NOVO] normaliza entrada

        if (!dados || dados.length === 0) {
            tbody.innerHTML = "<tr><td colspan='11' style='text-align:center; padding: 20px;'>Nenhum dado encontrado.</td></tr>";
            return;
        }

        tbody.innerHTML = dados.map(d => {
            // Extração do mês para o filtro (assume formato ISO do Sheets YYYY-MM-DD)
            const mesISO = d.vigencia_inicio ? String(d.vigencia_inicio).split('-')[1] : "";

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

        // Aplica o filtro atual logo após renderizar
        atualizarCards(dados);      // Atualiza KPIs do total
        filtrarTabela();            // Aplica filtro e atualiza KPIs+gráficos
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
                const dadosNorm = normalizarLista(res.dados); // [NOVO]
                localStorage.setItem(CACHE_KEY, JSON.stringify(dadosNorm)); // [NOVO] salva normalizado
                renderizarDados(dadosNorm);
                alert("Sincronizado!");
            } else {
                alert("Sheets respondeu, mas sem dados para esta unidade.");
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
        window.location.href = "index.html";
    };

    /* [INICIALIZACAO] Carregar Cache Local */
    const dadosSalvos = localStorage.getItem(CACHE_KEY);
    if (dadosSalvos) {
        const dados = JSON.parse(dadosSalvos);      // [CORREÇÃO] antes havia erro de sintaxe em versões anteriores
        renderizarDados(dados);                      // [CORREÇÃO]
        // filtrarTabela() já chama atualizarGraficos via fluxo normal
    }
});
