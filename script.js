document.addEventListener('DOMContentLoaded', () => {
    const sourceLangSelect = document.getElementById('source-lang');
    const targetLangSelect = document.getElementById('target-lang');
    const inputTextarea = document.getElementById('input-text');
    const outputTextarea = document.getElementById('output-text');
    const translateBtn = document.getElementById('translate-btn');
    const swapLanguagesBtn = document.getElementById('swap-languages');
    const charCountElement = document.getElementById('char-count');
    const errorMessageElement = document.getElementById('error-message');

    const MAX_CHARS = 500; // Limite da API MyMemory para requisições não autenticadas

    // Lista de idiomas comuns (código: nome)
    // Códigos de idioma ISO 639-1
    const languages = {
        "en": "Inglês",
        "pt": "Português",
        "es": "Espanhol",
        "fr": "Francês",
        "de": "Alemão",
        "it": "Italiano",
        "ja": "Japonês",
        "ko": "Coreano",
        "zh-CN": "Chinês (Simplificado)", // MyMemory usa zh-CN ou zh-TW
        "ru": "Russo",
        "ar": "Árabe",
        "hi": "Hindi",
        "nl": "Holandês",
        "sv": "Sueco",
        "pl": "Polonês",
        "tr": "Turco"
    };

    // Preenche os seletores de idioma
    function populateLanguageSelectors() {
        // Opção "Detectar Idioma" apenas para o idioma de origem
        const autoDetectOption = document.createElement('option');
        autoDetectOption.value = "auto";
        autoDetectOption.textContent = "Detectar Idioma";
        sourceLangSelect.appendChild(autoDetectOption);

        for (const code in languages) {
            const optionSource = document.createElement('option');
            optionSource.value = code;
            optionSource.textContent = languages[code];
            sourceLangSelect.appendChild(optionSource);

            const optionTarget = document.createElement('option');
            optionTarget.value = code;
            optionTarget.textContent = languages[code];
            targetLangSelect.appendChild(optionTarget);
        }
        // Define padrões
        sourceLangSelect.value = "auto"; // Padrão para detectar
        targetLangSelect.value = "pt"; // Padrão para Português como destino
    }

    // Atualiza a contagem de caracteres
    inputTextarea.addEventListener('input', () => {
        const count = inputTextarea.value.length;
        charCountElement.textContent = `${count}/${MAX_CHARS}`;
        if (count > MAX_CHARS) {
            charCountElement.style.color = 'red';
            translateBtn.disabled = true;
        } else {
            charCountElement.style.color = '#777';
            translateBtn.disabled = false;
        }
    });

    // Função para traduzir texto
    async function translateText() {
        const sourceText = inputTextarea.value.trim();
        let sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        errorMessageElement.textContent = ''; // Limpa mensagens de erro anteriores
        outputTextarea.value = 'Traduzindo...';
        translateBtn.disabled = true;

        if (!sourceText) {
            outputTextarea.value = '';
            translateBtn.disabled = false;
            return;
        }

        if (sourceText.length > MAX_CHARS) {
            errorMessageElement.textContent = `O texto excede o limite de ${MAX_CHARS} caracteres.`;
            outputTextarea.value = '';
            translateBtn.disabled = false; // Reabilita se o usuário corrigir
            return;
        }

        // MyMemory API não diferencia "auto" no langpair, então removemos se for "auto"
        // A API tenta detectar automaticamente se o primeiro par de idioma está faltando.
        // Ex: &langpair=|pt (detecta origem, traduz para pt)
        const langPair = sourceLang === "auto" ? `|${targetLang}` : `${sourceLang}|${targetLang}`;

        try {
            const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=${langPair}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.responseData) {
                if (data.responseData.translatedText) {
                    // Decodifica entidades HTML que podem vir da API
                    const decodedText = new DOMParser().parseFromString(data.responseData.translatedText, "text/html").documentElement.textContent;
                    outputTextarea.value = decodedText;

                    // Se "Detectar Idioma" foi usado, atualiza o select de origem
                    if (sourceLang === "auto" && data.responseData.detectedLanguage) {
                         const detectedLangCode = data.responseData.detectedLanguage.toLowerCase();
                         // Verifica se o idioma detectado está na nossa lista
                         if (languages[detectedLangCode]) {
                            sourceLangSelect.value = detectedLangCode;
                         } else if (detectedLangCode.startsWith("zh")){ // Caso específico para Chinês
                            if (languages["zh-CN"]) sourceLangSelect.value = "zh-CN";
                         }
                         // Poderia adicionar uma lógica mais robusta para mapear códigos detectados
                    }

                } else {
                    outputTextarea.value = "Não foi possível traduzir.";
                    errorMessageElement.textContent = "A tradução falhou. Verifique os idiomas ou tente novamente.";
                }
            } else if (data.responseStatus === 429) { // Too Many Requests
                 outputTextarea.value = "Erro ao traduzir.";
                 errorMessageElement.textContent = "Limite de requisições atingido. Tente novamente mais tarde.";
            }
            else {
                outputTextarea.value = "Erro ao traduzir.";
                errorMessageElement.textContent = data.responseDetails || "Ocorreu um erro desconhecido.";
            }
        } catch (error) {
            console.error("Erro na tradução:", error);
            outputTextarea.value = "Erro na conexão.";
            errorMessageElement.textContent = "Não foi possível conectar ao serviço de tradução. Verifique sua internet.";
        } finally {
            // Reabilita o botão, exceto se o limite de caracteres ainda estiver excedido
            translateBtn.disabled = inputTextarea.value.length > MAX_CHARS;
        }
    }

    // Inverte os idiomas selecionados
    function swapLanguages() {
        const sourceVal = sourceLangSelect.value;
        const targetVal = targetLangSelect.value;

        // Não pode inverter se "Detectar Idioma" estiver selecionado na origem
        // e o destino se tornar "Detectar Idioma" (o que não faz sentido)
        if (sourceVal === "auto") {
            // Se a origem é "auto", apenas trocamos o texto,
            // e o usuário pode querer traduzir de volta.
            // A API vai detectar o idioma do texto que agora está no input.
            const tempText = inputTextarea.value;
            inputTextarea.value = outputTextarea.value;
            outputTextarea.value = tempText; // Limpa a saída antiga ou move o texto traduzido

            // Após a troca de texto, se o campo de input não estiver vazio, podemos traduzir.
            if(inputTextarea.value.trim() !== "") {
                sourceLangSelect.value = targetVal; // A antiga língua alvo vira a nova "origem"
                                                // mesmo que o select de origem ainda possa ser "auto"
                                                // o importante é que o `targetLangSelect` seja o destino correto.
                // targetLangSelect.value continua o mesmo pois já era o sourceVal
                // mas se sourceVal era auto, temos que definir um targetVal que não seja auto
                if(targetVal !== "auto"){ // Se o targetVal não era 'auto' (o que é o esperado)
                    targetLangSelect.value = "pt"; // Ou algum padrão, ou o valor anterior de sourceVal se não for "auto"
                } else {
                     targetLangSelect.value = "pt"; // Default se ambos acabarem como "auto"
                }

            }
            return; // Sai da função após a troca de texto.
        }


        sourceLangSelect.value = targetVal;
        targetLangSelect.value = sourceVal;

        // Opcional: trocar o texto também
        const tempText = inputTextarea.value;
        inputTextarea.value = outputTextarea.value;
        // Só coloca o texto antigo na saída se houver algo, senão limpa
        outputTextarea.value = tempText ? tempText : "";

        // Atualiza a contagem de caracteres para o novo texto de entrada
        const count = inputTextarea.value.length;
        charCountElement.textContent = `${count}/${MAX_CHARS}`;
        charCountElement.style.color = count > MAX_CHARS ? 'red' : '#777';
        translateBtn.disabled = count > MAX_CHARS;
    }

    // Event Listeners
    translateBtn.addEventListener('click', translateText);
    swapLanguagesBtn.addEventListener('click', swapLanguages);

    // Permite traduzir com "Enter" na textarea de entrada, se não estiver usando Shift+Enter para nova linha
    inputTextarea.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Impede nova linha
            if (!translateBtn.disabled) {
                 translateText();
            }
        }
    });

    // Inicializa
    populateLanguageSelectors();
});