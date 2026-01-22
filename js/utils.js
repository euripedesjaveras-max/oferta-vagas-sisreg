function getUnidadeFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("unidade");
}

function fetchJSON(path) {
  return fetch(path).then(r => r.json());
}

