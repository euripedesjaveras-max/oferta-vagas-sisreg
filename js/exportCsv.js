document.getElementById("ofertaForm").addEventListener("submit", e => {
  e.preventDefault();

  const dias = [...document.querySelectorAll("input[type=checkbox]:checked")]
    .map(c => c.value)
    .join(" ");

  const exames = [...document.getElementById("examesSelect").selectedOptions]
    .map(o => o.value)
    .join("; ");

  const linha = [
    profissionalSelect.value,
    profissionalSelect.selectedOptions[0].textContent,
    procedimentoSelect.value,
    procedimentoSelect.selectedOptions[0].textContent,
    exames,
    dias,
    horaInicio.value,
    horaFim.value,
    vagas.value,
    dataInicio.value,
    dataFim.value
  ].join(",");

  const csv = "CPF,NOME,COD_PROC,PROC,EXAMES,DIAS,H_INI,H_FIM,VAGAS,DATA_INI,DATA_FIM\n" + linha;

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `oferta_${unidade}.csv`;
  a.click();
});

