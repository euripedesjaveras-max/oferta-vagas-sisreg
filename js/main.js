const unidade = getUnidadeFromURL();
const profissionalSelect = document.getElementById("profissionalSelect");
const procedimentoSelect = document.getElementById("procedimentoSelect");
const examesSelect = document.getElementById("examesSelect");
const avisoProfissional = document.getElementById("avisoProfissional");

if (!unidade) {
  alert("Unidade não identificada na URL.");
  throw new Error("Unidade ausente");
}

Promise.all([
  fetchJSON("data/unidades.json"),
  fetchJSON("data/profissionais.json"),
  fetchJSON("data/procedimentos_exames.json")
]).then(([unidades, profissionais, procedimentos]) => {

  const unidadeAtual = unidades.find(u => u.id === unidade);
  document.getElementById("titulo-unidade").innerText =
    `Oferta de Vagas - ${unidadeAtual.nome}`;

  // PROFISSIONAIS
  profissionais
    .filter(p => p.unidade === unidade)
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.cpf;
      opt.textContent = p.nome;
      opt.dataset.status = p.status;
      profissionalSelect.appendChild(opt);
    });

  profissionalSelect.addEventListener("change", () => {
    const status =
      profissionalSelect.selectedOptions[0].dataset.status;

    avisoProfissional.textContent =
      status === "INATIVO"
        ? "⚠️ Profissional inativo, favor solicitar ativação via suporte GLPI."
        : "";
  });

  // PROCEDIMENTOS
  procedimentos.forEach(proc => {
    const opt = document.createElement("option");
    opt.value = proc.codigo;
    opt.textContent = proc.descricao;
    opt.dataset.tipo = proc.tipo;
    opt.dataset.exames = JSON.stringify(proc.exames || []);
    procedimentoSelect.appendChild(opt);
  });

  procedimentoSelect.addEventListener("change", () => {
    const opt = procedimentoSelect.selectedOptions[0];
    const tipo = opt.dataset.tipo;

    examesSelect.innerHTML = "";
    examesSelect.disabled = tipo !== "GRUPO";

    if (tipo === "GRUPO") {
      JSON.parse(opt.dataset.exames).forEach(ex => {
        const eOpt = document.createElement("option");
        eOpt.value = ex;
        eOpt.textContent = ex;
        examesSelect.appendChild(eOpt);
      });
    }
  });
});

