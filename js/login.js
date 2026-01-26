// js/login.js

document.addEventListener("DOMContentLoaded", () => {
    const unidadeSelect = document.getElementById("unidadeSelect");
    const formLogin = document.getElementById("formLogin");
    const loginError = document.getElementById("loginError");

    // 1. Carregar unidades do arquivo JSON
    fetch("data/unidades.json")
        .then(response => response.json())
        .then(data => {
            unidadeSelect.innerHTML = '<option value="" disabled selected>Selecione sua unidade...</option>';
            
            // Aceita tanto um array direto quanto um objeto com lista
            const lista = Array.isArray(data) ? data : (data.unidades || []);
            
            lista.forEach(unidade => {
                const option = document.createElement("option");
                option.value = unidade.NOME_FANTASIA;
                option.textContent = `${unidade.CODIGO_CNES} - ${unidade.NOME_FANTASIA}`;
                unidadeSelect.appendChild(option);
            });
        })
        .catch(err => {
            console.error("Erro ao carregar unidades:", err);
            unidadeSelect.innerHTML = '<option value="">Erro ao carregar unidades</option>';
        });

    // 2. Processar Login
    formLogin.addEventListener("submit", (e) => {
        e.preventDefault();
        const unidade = unidadeSelect.value;
        const senha = document.getElementById("password").value;

        // Lógica de senha simples para o exemplo (pode ser personalizada)
        if (senha === "1234") { 
            localStorage.setItem("unidade_selecionada", unidade);
            
            // Efeito visual de transição
            document.body.style.opacity = "0";
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);
        } else {
            loginError.style.display = "block";
            loginError.textContent = "Senha inválida. Tente novamente.";
        }
    });
});
