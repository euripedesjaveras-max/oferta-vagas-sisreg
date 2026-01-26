// js/login.js

document.addEventListener("DOMContentLoaded", () => {
    const unidadeSelect = document.getElementById("unidadeSelect");
    const formLogin = document.getElementById("formLogin");
    const loginError = document.getElementById("loginError");
    
    let unidadesData = [];

    // 1. Carregar unidades do arquivo JSON
    fetch("data/unidades.json")
        .then(response => response.json())
        .then(data => {
            unidadesData = Array.isArray(data) ? data : (data.unidades || []);
            unidadeSelect.innerHTML = '<option value="" disabled selected>Selecione a unidade...</option>';
            
            unidadesData.forEach(unidade => {
                const option = document.createElement("option");
                option.value = unidade.NOME_FANTASIA;
                option.textContent = unidade.NOME_FANTASIA;
                unidadeSelect.appendChild(option);
            });
        })
        .catch(err => {
            console.error("Erro ao carregar unidades:", err);
            unidadeSelect.innerHTML = '<option value="">Erro ao carregar lista</option>';
        });

    // 2. Processar Login
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const nomeUnidade = unidadeSelect.value;
        const senhaDigitada = document.getElementById("password").value;

        // Encontra o objeto da unidade selecionada
        const unidadeEncontrada = unidadesData.find(u => u.NOME_FANTASIA === nomeUnidade);

        if (unidadeEncontrada) {
            // A senha é o CODIGO_CNES da unidade encontrada
            if (senhaDigitada === unidadeEncontrada.CODIGO_CNES) {
                localStorage.setItem("unidade_selecionada", nomeUnidade);
                localStorage.setItem("cnes_selecionado", unidadeEncontrada.CODIGO_CNES);
                
                // Redireciona para o Dashboard
                window.location.href = "dashboard.html";
            } else {
                loginError.textContent = "Senha incorreta para esta unidade.";
                loginError.style.display = "block";
            }
        } else {
            loginError.textContent = "Selecione uma unidade válida.";
            loginError.style.display = "block";
        }
    });
});
