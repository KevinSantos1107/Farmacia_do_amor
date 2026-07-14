// ===== JOGO DE PALAVRAS - SISTEMA COM MÚLTIPLAS PALAVRAS POR PERGUNTA =====
// Versão completa e otimizada

console.log('🎮 Sistema de Jogo de Palavras carregado (Múltiplas Palavras)');

// ===== CONFIGURAÇÕES GLOBAIS =====
const WordGame = {
    // Estado do jogo
    currentWord: '',
    currentQuestion: '',
    currentMessage: '',
    currentRow: 0,
    currentCol: 0,
    maxAttempts: 6,
    wordLength: 0,
    gameActive: false,
    isProcessing: false,
    
    // Dados - NOVA ESTRUTURA
    questions: [], // Array de perguntas (cada uma com múltiplas palavras)
    
    // Persistência
    usedWords: [], // Array de IDs "perguntaId:palavra" já jogadas
    savedGuesses: [], // Tentativas do jogo em andamento para restaurar
    
    // Dicionário de validação
    hasValidWords: false,
    
    
    // Elementos DOM (cache para performance)
    elements: {
        modal: null,
        grid: null,
        keyboard: null,
        result: null,
        questionElement: null,
        attemptsText: null,
        closeBtn: null,
        nextBtn: null
    },
    
    // Estado do teclado
    keyboardState: {},
    
    // Estatísticas completas
    stats: {
        gamesPlayed: 0,
        wins: 0,
        currentStreak: 0,
        bestStreak: 0,
        distribution: [0, 0, 0, 0, 0, 0] // índice 0 = acertou na 1ª tentativa, etc.
    },
    
    // Histórico da partida atual para compartilhar
    guessHistory: [],
    
    /**
     * Inicializa o jogo
     */
    init() {
        console.log('🔧 Inicializando jogo...');
        
        // Cache de elementos DOM
        this.elements.modal = document.getElementById('wordGameModal');
        this.elements.grid = document.getElementById('wordGameGrid');
        this.elements.keyboard = document.getElementById('wordGameKeyboard');
        this.elements.result = document.getElementById('wordGameResult');
        this.elements.questionElement = document.getElementById('wordGameQuestion');
        this.elements.attemptsText = document.getElementById('attemptsText');
        this.elements.closeBtn = document.getElementById('closeWordGameBtn');
        this.elements.nextBtn = document.getElementById('nextWordBtn');
        
        // Validação
        if (!this.elements.modal) {
            console.error('❌ Modal do jogo não encontrado!');
            return;
        }
        
        // Configurar eventos
        this.attachEvents();
        
        // Carregar estatísticas salvas
        this.loadStats();
        this.updateStreakBadge();
        
        // Carregar estado de palavras usadas
        this.loadUsedWords();
        
        // Carregar dicionário
        this.loadDictionary();
        
        // Carregar palavras
        this.loadWordsFromFirebase();
        
        console.log('✅ Jogo de Palavras inicializado com sucesso');
    },
    
    /**
     * Anexa todos os event listeners
     */
    attachEvents() {
        // Botão de fechar
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.closeGame());
        }
        
        // Clique fora do modal para fechar
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeGame();
            }
        });
        
        // Botão próxima palavra
        if (this.elements.nextBtn) {
            this.elements.nextBtn.addEventListener('click', () => this.startNewGame());
        }
        
        // ✨ NOVO: Botões de ação (APAGAR e ENVIAR)
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                console.log(`🎯 Botão de ação clicado: ${key}`);
                this.handleKeyPress(key);
            });
        });
        
        // Teclado virtual (letras A-Z)
        const keyBtns = this.elements.keyboard.querySelectorAll('.key-btn');
        keyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                this.handleKeyPress(key);
            });
        });
        
        // Teclado físico
        document.addEventListener('keydown', (e) => {
            // Só processa se o modal estiver aberto
            if (this.elements.modal.style.display !== 'flex') return;
            
            const key = e.key.toUpperCase();
            
            if (key === 'ENTER') {
                e.preventDefault();
                this.handleKeyPress('ENTER');
            } else if (key === 'BACKSPACE') {
                e.preventDefault();
                this.handleKeyPress('BACKSPACE');
            } else if (/^[A-ZÀ-Ü]$/.test(key)) {
                e.preventDefault();
                this.handleKeyPress(key);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.closeGame();
            }
        });
        
        // Badge de streak — abre estatísticas
        const streakBadge = document.getElementById('streakBadge');
        if (streakBadge) {
            streakBadge.addEventListener('click', () => this.showStats());
        }
        
        // Fechar painel de estatísticas
        const statsClose = document.getElementById('wgStatsClose');
        if (statsClose) {
            statsClose.addEventListener('click', () => this.closeStats());
        }
        const statsOverlay = document.getElementById('wgStatsOverlay');
        if (statsOverlay) {
            statsOverlay.addEventListener('click', (e) => {
                if (e.target === statsOverlay) this.closeStats();
            });
        }
        
        console.log('✅ Eventos configurados');
    },
    
    /**
     * ✨ NOVO: Carrega o dicionário de palavras válidas
     * Modificado para contornar erro de CORS no protocolo file://
     */
    async loadDictionary() {
        return new Promise((resolve) => {
            console.log('📥 Carregando dicionário de palavras via script (Otimizado)...');
            
            // Se já estiver carregado (para não recarregar duas vezes acidentalmente)
            if (window.VALID_PT_WORDS_STR) {
                this.hasValidWords = true;
                console.log(`✅ Dicionário otimizado carregado: ${window.VALID_PT_WORDS_STR.length / 5} palavras`);
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = './assets/data/pt-5-letters.js';
            
            script.onload = () => {
                if (window.VALID_PT_WORDS_STR) {
                    this.hasValidWords = true;
                    console.log(`✅ Dicionário ultra-leve carregado com sucesso: ${window.VALID_PT_WORDS_STR.length / 5} palavras`);
                } else {
                    console.warn('⚠️ Script carregado, mas VALID_PT_WORDS_STR não definido.');
                }
                resolve();
            };
            
            script.onerror = (e) => {
                console.error('❌ Erro ao carregar dicionário via script (arquivo não encontrado).', e);
                resolve(); // resolvemos mesmo com erro para não travar o fluxo
            };
            
            document.head.appendChild(script);
        });
    },
    
    /**
     * Valida palavra usando busca binária em uma string contígua ultra-leve
     */
    isValidWord(guess) {
        if (!this.hasValidWords || !window.VALID_PT_WORDS_STR) return true; // Fallback
        
        const str = window.VALID_PT_WORDS_STR;
        let left = 0;
        let right = (str.length / 5) - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const word = str.substring(mid * 5, mid * 5 + 5);
            
            if (word === guess) return true;
            if (word < guess) left = mid + 1;
            else right = mid - 1;
        }
        
        return false;
    },
    
    /**
     * ✨ NOVO: Carrega perguntas com múltiplas palavras do Firebase
     */
    async loadWordsFromFirebase() {
        // Verifica se Firebase está disponível
        if (typeof db === 'undefined') {
            console.warn('⚠️ Firebase não está inicializado - usando palavras padrão');
            this.loadDefaultWords();
            return;
        }
        
        try {
            console.log('📥 Carregando perguntas do Firebase...');
            const snapshot = await db.collection('word_game').orderBy('createdAt', 'asc').get();
            
            if (snapshot.empty) {
                console.log('ℹ️ Nenhuma pergunta no Firebase - usando palavras padrão');
                this.loadDefaultWords();
                return;
            }
            
            this.questions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // ✨ VALIDAÇÃO NOVA ESTRUTURA (array de palavras)
                if (data.pergunta && data.palavras && Array.isArray(data.palavras)) {
                    // Valida cada palavra do array
                    const palavrasValidas = data.palavras.filter(p => 
                        p.palavra && p.mensagem
                    );
                    
                    if (palavrasValidas.length > 0) {
                        this.questions.push({
                            id: doc.id,
                            pergunta: data.pergunta,
                            palavras: palavrasValidas
                        });
                    }
                }
                // ✨ BACKWARD COMPATIBILITY: Aceita estrutura antiga também
                else if (data.palavra && data.pergunta && data.mensagem) {
                    this.questions.push({
                        id: doc.id,
                        pergunta: data.pergunta,
                        palavras: [{
                            palavra: data.palavra,
                            mensagem: data.mensagem
                        }]
                    });
                }
            });
            
            console.log(`✅ ${this.questions.length} perguntas carregadas do Firebase`);
            
            // Fallback se não houver perguntas válidas
            if (this.questions.length === 0) {
                this.loadDefaultWords();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar perguntas:', error);
            this.loadDefaultWords();
        }
    },
    
    /** ✨ MODIFICADO: Carrega palavras padrão com nova estrutura */
    loadDefaultWords() {
        this.questions = [
            {
                id: 'default-1',
                pergunta: 'O que mais gosto em você?',
                palavras: [
                    { palavra: 'SORRISO', mensagem: '✨ É isso que eu mais amo em você!' },
                    { palavra: 'OLHOS', mensagem: '👀 Seus olhos me encantam!' },
                    { palavra: 'JEITO', mensagem: '💕 Seu jeito único me conquistou!' }
                ]
            },
            {
                id: 'default-2',
                pergunta: 'O que sinto quando estou com você?',
                palavras: [
                    { palavra: 'FELIZ', mensagem: '😊 Você me faz tão feliz!' },
                    { palavra: 'COMPLETO', mensagem: '🧩 Você completa minha vida!' },
                    { palavra: 'AMADO', mensagem: '❤️ Me sinto tão amado!' }
                ]
            },
            {
                id: 'default-3',
                pergunta: 'Como foi nosso primeiro encontro?',
                palavras: [
                    { palavra: 'MAGICO', mensagem: '🌟 Foi mágico desde o início!' },
                    { palavra: 'PERFEITO', mensagem: '✨ Foi simplesmente perfeito!' },
                    { palavra: 'INESQUECIVEL', mensagem: '💫 Nunca vou esquecer!' }
                ]
            },
            {
                id: 'default-4',
                pergunta: 'O que você é para mim?',
                palavras: [
                    { palavra: 'TUDO', mensagem: '❤️ Você é tudo que eu sempre quis!' },
                    { palavra: 'AMOR', mensagem: '💖 Você é meu grande amor!' }
                ]
            },
            {
                id: 'default-5',
                pergunta: 'O que quero construir com você?',
                palavras: [
                    { palavra: 'FUTURO', mensagem: '🏡 Quero todos os meus dias ao seu lado!' },
                    { palavra: 'SONHOS', mensagem: '💭 Nossos sonhos juntos!' },
                    { palavra: 'FAMILIA', mensagem: '👨‍👩‍👧‍👦 Nossa família feliz!' }
                ]
            },
            {
                id: 'default-6',
                pergunta: 'Como você me faz sentir?',
                palavras: [
                    { palavra: 'ESPECIAL', mensagem: '⭐ Você me faz sentir especial!' },
                    { palavra: 'IMPORTANTE', mensagem: '🌟 Me sinto importante com você!' }
                ]
            },
            {
                id: 'default-7',
                pergunta: 'O que é a nossa relação?',
                palavras: [
                    { palavra: 'PERFEITA', mensagem: '🌹 Perfeita do jeito que é!' },
                    { palavra: 'ESPECIAL', mensagem: '💝 Especial e única!' }
                ]
            }
        ];
        
        console.log('✅ Palavras padrão carregadas (nova estrutura)');
    },
    
    /**
     * Abre o modal do jogo
     */
    openGame() {
        console.log('🎮 Abrindo jogo...');
        
        this.elements.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Integração com sistema de histórico
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.push('word-game-modal');
        }
        
        // Tenta restaurar jogo salvo ou inicia novo
        if (this.hasSavedGame()) {
            this.restoreGame();
        } else {
            this.startNewGame();
        }
        
        console.log('✅ Jogo aberto');
    },
    
    /**
     * Fecha o modal do jogo
     */
    closeGame() {
        this.elements.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.gameActive = false;
        this.isProcessing = false;
        console.log('🔒 Jogo fechado');
    },
    
    /**
     * ✨ MODIFICADO: Inicia uma nova rodada (escolhe palavra aleatória não jogada)
     */
    startNewGame() {
        console.log('🎮 === INICIANDO NOVA RODADA ===');
        
        // Reset completo do estado
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameActive = true;
        this.isProcessing = false;
        this.keyboardState = {};
        this.guessHistory = [];
        this.savedGuesses = [];
        
        console.log('✅ Estado resetado');
        
        // ✨ Escolher palavra aleatória não jogada
        let availablePool = [];
        this.questions.forEach(q => {
            q.palavras.forEach(p => {
                const id = `${q.id}:${p.palavra}`;
                if (!this.usedWords.includes(id)) {
                    availablePool.push({ question: q, wordData: p, id: id });
                }
            });
        });
        
        // Se já jogou todas, resetar lista
        if (availablePool.length === 0 && this.questions.length > 0) {
            console.log('🔄 Todas as palavras jogadas - resetando lista');
            this.usedWords = [];
            this.saveUsedWords();
            return this.startNewGame();
        }
        
        // Fallback caso não haja perguntas
        if (availablePool.length === 0) {
            console.warn('⚠️ Nenhuma palavra disponível no pool');
            return;
        }
        
        // Selecionar aleatoriamente
        const randomItem = availablePool[Math.floor(Math.random() * availablePool.length)];
        
        // Marcar como usada e salvar
        this.usedWords.push(randomItem.id);
        this.saveUsedWords();
        
        this.currentWord = this.normalizeWord(randomItem.wordData.palavra);
        this.currentQuestion = randomItem.question.pergunta;
        this.currentMessage = randomItem.wordData.mensagem;
        this.wordLength = this.currentWord.length;
        
        console.log(`🎯 Pergunta: "${this.currentQuestion}"`);
        console.log(`🎯 Palavra escolhida: "${this.currentWord}" (${this.wordLength} letras)`);
        console.log(`💬 Mensagem: "${this.currentMessage}"`);
        
        // Atualizar UI
        this.elements.questionElement.textContent = this.currentQuestion;
        
        // Criar grid
        this.createGrid();
        
        // Resetar teclado
        this.resetKeyboard();
        
        // Esconder resultado
        this.elements.result.style.display = 'none';
        
        // Salvar o estado inicial do novo jogo
        this.saveGameState();
        
        console.log('✅ Nova rodada pronta - JOGO ATIVO');
    },
    
    /**
     * ✨ NOVO: Restaura um jogo em andamento
     */
    restoreGame() {
        console.log('♻️ === RESTAURANDO JOGO SALVO ===');
        const state = JSON.parse(localStorage.getItem('wordGameState'));
        
        this.currentWord = state.currentWord;
        this.currentQuestion = state.currentQuestion;
        this.currentMessage = state.currentMessage;
        this.wordLength = state.wordLength;
        this.savedGuesses = state.guesses || [];
        
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameActive = true;
        this.isProcessing = false;
        this.keyboardState = {};
        this.guessHistory = [];
        
        // Atualizar UI
        this.elements.questionElement.textContent = this.currentQuestion;
        this.elements.result.style.display = 'none';
        
        // Recriar grid limpo
        this.createGrid();
        this.resetKeyboard();
        
        // Reaplicar as tentativas salvas sem animação
        this.savedGuesses.forEach((guess, index) => {
            this.currentRow = index;
            // Preencher a linha visualmente
            for (let i = 0; i < this.wordLength; i++) {
                const box = this.elements.grid.querySelector(`[data-row="${index}"][data-col="${i}"]`);
                if (box) {
                    box.textContent = guess[i];
                    box.classList.add('filled');
                }
            }
            // Avaliar para pintar e atualizar teclado/histórico
            this.evaluateGuessSilent(guess);
        });
        
        this.currentRow = this.savedGuesses.length;
        this.currentCol = 0;
        this.updateCurrentBox();
        
        console.log(`✅ Jogo restaurado na tentativa ${this.currentRow}/${this.maxAttempts}`);
    },
    
    /**
     * Avalia uma tentativa silenciosamente (sem animações ou delays)
     */
    evaluateGuessSilent(guess) {
        const letterCount = {};
        const guessArray = guess.split('');
        const wordArray = this.currentWord.split('');
        const result = new Array(this.wordLength).fill('absent');
        
        wordArray.forEach(letter => { letterCount[letter] = (letterCount[letter] || 0) + 1; });
        
        for (let i = 0; i < this.wordLength; i++) {
            if (guessArray[i] === wordArray[i]) {
                result[i] = 'correct';
                letterCount[guessArray[i]]--;
            }
        }
        
        for (let i = 0; i < this.wordLength; i++) {
            if (result[i] !== 'correct' && letterCount[guessArray[i]] > 0) {
                result[i] = 'present';
                letterCount[guessArray[i]]--;
            }
        }
        
        for (let i = 0; i < this.wordLength; i++) {
            const box = this.elements.grid.querySelector(`[data-row="${this.currentRow}"][data-col="${i}"]`);
            const letter = guessArray[i];
            const status = result[i];
            
            box.classList.add(status);
            this.updateKeyboard(letter, status);
        }
        
        this.saveGuessToHistory(result);
    },
    
    /**
     * Métodos de Persistência
     */
    hasSavedGame() {
        return !!localStorage.getItem('wordGameState');
    },
    
    saveGameState() {
        const state = {
            currentWord: this.currentWord,
            currentQuestion: this.currentQuestion,
            currentMessage: this.currentMessage,
            wordLength: this.wordLength,
            guesses: this.savedGuesses
        };
        localStorage.setItem('wordGameState', JSON.stringify(state));
    },
    
    clearGameState() {
        localStorage.removeItem('wordGameState');
    },
    
    loadUsedWords() {
        try {
            const saved = localStorage.getItem('wordGameUsedWords');
            if (saved) {
                this.usedWords = JSON.parse(saved);
            }
        } catch(e) {
            this.usedWords = [];
        }
    },
    
    saveUsedWords() {
        localStorage.setItem('wordGameUsedWords', JSON.stringify(this.usedWords));
    },
    
    /**
     * Normaliza palavra (remove acentos, maiúsculas)
     */
    normalizeWord(word) {
        return word
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    },
    
    /**
     * Cria o grid de letras com CLIQUE para selecionar quadrado
     */
    createGrid() {
        this.elements.grid.innerHTML = '';
        
        // Adiciona classe dinâmica baseada no tamanho da palavra
        this.elements.grid.className = 'word-game-grid';
        
        if (this.wordLength >= 8) {
            this.elements.grid.classList.add(`word-length-${this.wordLength}`);
            console.log(`📏 Grid configurado para ${this.wordLength} letras`);
        }
        
        const fragment = document.createDocumentFragment();
        
        for (let row = 0; row < this.maxAttempts; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'grid-row';
            
            for (let col = 0; col < this.wordLength; col++) {
                const box = document.createElement('div');
                box.className = 'letter-box';
                box.dataset.row = row;
                box.dataset.col = col;
                
                // Adiciona evento de clique no quadrado
                box.addEventListener('click', () => this.handleBoxClick(row, col));
                box.style.cursor = 'pointer';
                
                rowDiv.appendChild(box);
            }
            
            fragment.appendChild(rowDiv);
        }
        
        this.elements.grid.appendChild(fragment);
        this.updateCurrentBox();
    },
    
    /**
     * Trata clique em um quadrado
     */
    handleBoxClick(row, col) {
        // Só permite clicar na linha atual
        if (row !== this.currentRow) {
            console.log(`🚫 Clique bloqueado: linha ${row} (atual: ${this.currentRow})`);
            return;
        }
        
        // Só permite se o jogo estiver ativo e não processando
        if (!this.gameActive || this.isProcessing) {
            console.log(`🚫 Clique bloqueado: jogo inativo ou processando`);
            return;
        }
        
        // Atualiza a coluna atual
        this.currentCol = col;
        console.log(`🖱️ Quadrado selecionado: linha ${row}, coluna ${col}`);
        
        // Atualiza visual
        this.updateCurrentBox();
    },
    
    /**
     * Reseta o teclado visual
     */
    resetKeyboard() {
        const keys = this.elements.keyboard.querySelectorAll('.key-btn');
        keys.forEach(key => {
            key.classList.remove('key-correct', 'key-present', 'key-absent');
        });
    },
    
    /**
     * Atualiza a caixa atual (visual feedback)
     */
    updateCurrentBox() {
        const boxes = this.elements.grid.querySelectorAll('.letter-box');
        
        // Remove classe 'current' de todos
        boxes.forEach(box => box.classList.remove('current'));
        
        // Remove classe 'clickable' de todas as linhas
        boxes.forEach(box => box.classList.remove('clickable'));
        
        // Adiciona 'clickable' apenas na linha atual
        for (let col = 0; col < this.wordLength; col++) {
            const box = this.elements.grid.querySelector(
                `[data-row="${this.currentRow}"][data-col="${col}"]`
            );
            if (box && this.gameActive && !this.isProcessing) {
                box.classList.add('clickable');
            }
        }
        
        // Adiciona classe 'current' na posição atual
        if (this.currentRow < this.maxAttempts && this.currentCol < this.wordLength) {
            const currentBox = this.elements.grid.querySelector(
                `[data-row="${this.currentRow}"][data-col="${this.currentCol}"]`
            );
            if (currentBox) {
                currentBox.classList.add('current');
            }
        }
    },
    
    /**
     * Processa tecla pressionada
     */
    handleKeyPress(key) {
        if (!this.gameActive || this.isProcessing) {
            console.log(`🚫 Tecla "${key}" bloqueada (ativo: ${this.gameActive}, processando: ${this.isProcessing})`);
            return;
        }
        
        console.log(`⌨️ Tecla: ${key}`);
        
        if (key === 'ENTER') {
            this.submitGuess();
        } else if (key === 'BACKSPACE') {
            this.deleteLetter();
        } else if (/^[A-ZÀ-Ü]$/.test(key)) {
            this.addLetter(key);
        }
    },
    
    /**
     * Adiciona letra na posição atual (respeita seleção manual)
     */
    addLetter(letter) {
        if (this.currentCol >= this.wordLength) return;
        
        const normalizedLetter = this.normalizeWord(letter);
        const box = this.elements.grid.querySelector(
            `[data-row="${this.currentRow}"][data-col="${this.currentCol}"]`
        );
        
        if (box) {
            box.textContent = normalizedLetter;
            box.classList.add('filled');
            
            // Avança para próximo quadrado vazio (ou final da linha)
            this.currentCol++;
            this.updateCurrentBox();
        }
    },
    
    /** Remove letra da posição atual  */
    deleteLetter() {
        //, ✨ NOVO: Se passou do final da linha, volta para última posição
        if (this.currentCol >= this.wordLength) {
            this.currentCol = this.wordLength - 1;
        }
        
        // Se estiver em uma posição vazia, volta para a anterior
        const currentBox = this.elements.grid.querySelector(
            `[data-row="${this.currentRow}"][data-col="${this.currentCol}"]`
        );
        
        if (currentBox && currentBox.textContent === '' && this.currentCol > 0) {
            // Quadrado atual vazio, volta para o anterior
            this.currentCol--;
        }
        
        // Remove letra da posição atual
        const box = this.elements.grid.querySelector(
            `[data-row="${this.currentRow}"][data-col="${this.currentCol}"]`
        );
        
        if (box) {
            box.textContent = '';
            box.classList.remove('filled');
            this.updateCurrentBox();
        }
    },

    /**
     * Submete tentativa (com fix de animação)
     */
    submitGuess() {
        console.log('🔵 === SUBMIT GUESS ===');
        console.log(`   Ativo: ${this.gameActive} | Processando: ${this.isProcessing}`);
        console.log(`   Linha: ${this.currentRow} | Coluna: ${this.currentCol}`);
        
        if (this.isProcessing) {
            console.log('🚫 BLOQUEADO: Já processando tentativa');
            return;
        }
        
        if (!this.gameActive) {
            console.log('🚫 BLOQUEADO: Jogo inativo');
            return;
        }
        
        // Verifica se a palavra está completa
        const guess = this.getGuess(this.currentRow);
        if (guess.length !== this.wordLength) {
            console.log('🚫 BLOQUEADO: Palavra incompleta');
            this.shakeRow(this.currentRow);
            return;
        }
        
        // ✨ NOVO: Verifica se a palavra existe no dicionário usando busca binária otimizada
        if (this.wordLength === 5 && this.hasValidWords) {
            if (!this.isValidWord(guess)) {
                console.log(`🚫 BLOQUEADO: A palavra "${guess}" não existe no dicionário.`);
                this.shakeRow(this.currentRow);
                return;
            }
        }
        
        // Remove animação de seleção quando palavra completa é submetida
        const boxes = this.elements.grid.querySelectorAll(`[data-row="${this.currentRow}"]`);
        boxes.forEach(box => {
            box.classList.remove('current', 'clickable');
        });
        console.log('✅ Animações de seleção removidas');
        
        this.isProcessing = true;
        this.gameActive = false;
        console.log('🔒 JOGO BLOQUEADO - Processando...');
        
        console.log(`📝 Tentativa: "${guess}" | Resposta: "${this.currentWord}"`);
        
        // Avaliar tentativa (anima as cores)
        this.evaluateGuess(guess);
        
        // ✨ NOVO: Salvar tentativa no jogo em andamento
        this.savedGuesses.push(guess);
        this.saveGameState();
        
        // Aguardar animações terminarem
        const animationTime = this.wordLength * 200 + 500;
        
        setTimeout(() => {
            this.checkResult(guess);
        }, animationTime);
    },
    
    /**
     * Obtém a palavra da linha atual
     */
    getGuess(row) {
        let guess = '';
        for (let col = 0; col < this.wordLength; col++) {
            const box = this.elements.grid.querySelector(
                `[data-row="${row}"][data-col="${col}"]`
            );
            guess += box.textContent || '';
        }
        return guess;
    },
    
    /**
     * Salva o resultado da linha no histórico para compartilhar
     */
    saveGuessToHistory(result) {
        const emojiRow = result.map(status => {
            if (status === 'correct') return '🟩';
            if (status === 'present') return '🟨';
            return '⬛';
        }).join('');
        this.guessHistory.push(emojiRow);
    },
    
    /**
     * Avalia tentativa e aplica cores
     */
    evaluateGuess(guess) {
        const letterCount = {};
        const guessArray = guess.split('');
        const wordArray = this.currentWord.split('');
        const result = new Array(this.wordLength).fill('absent');
        
        // Contar letras na palavra correta
        wordArray.forEach(letter => {
            letterCount[letter] = (letterCount[letter] || 0) + 1;
        });
        
        // Primeira passada: marcar corretas (verde)
        for (let i = 0; i < this.wordLength; i++) {
            if (guessArray[i] === wordArray[i]) {
                result[i] = 'correct';
                letterCount[guessArray[i]]--;
            }
        }
        
        // Segunda passada: marcar presentes (amarelo)
        for (let i = 0; i < this.wordLength; i++) {
            if (result[i] !== 'correct' && letterCount[guessArray[i]] > 0) {
                result[i] = 'present';
                letterCount[guessArray[i]]--;
            }
        }
        
        // Aplicar cores com animação
        for (let i = 0; i < this.wordLength; i++) {
            const box = this.elements.grid.querySelector(
                `[data-row="${this.currentRow}"][data-col="${i}"]`
            );
            const letter = guessArray[i];
            const status = result[i];
            
            setTimeout(() => {
                box.classList.add(status);
                this.updateKeyboard(letter, status);
            }, i * 200);
        }
        
        // Salvar no histórico para compartilhar
        this.saveGuessToHistory(result);
    },
    
    /**
     * Atualiza estado do teclado visual
     */
    updateKeyboard(letter, status) {
        const keyBtn = this.elements.keyboard.querySelector(`[data-key="${letter}"]`);
        if (!keyBtn) return;
        
        const currentStatus = this.keyboardState[letter];
        
        // Hierarquia: correct > present > absent
        if (currentStatus === 'correct') return;
        if (currentStatus === 'present' && status !== 'correct') return;
        
        this.keyboardState[letter] = status;
        
        keyBtn.classList.remove('key-correct', 'key-present', 'key-absent');
        keyBtn.classList.add(`key-${status}`);
    },
    
    /**
     * Verifica resultado após animações
     */
    checkResult(guess) {
        console.log('🔍 Verificando resultado...');
        
        const isCorrect = (guess === this.currentWord);
        console.log(`   Resultado: ${isCorrect ? '✅ ACERTOU' : '❌ ERROU'}`);
        
        if (isCorrect) {
            this.handleWin();
        } else {
            this.currentRow++;
            this.currentCol = 0;
            
            if (this.currentRow >= this.maxAttempts) {
                this.handleLoss();
            } else {
                console.log(`➡️ Próxima tentativa: ${this.currentRow + 1}/${this.maxAttempts}`);
                this.isProcessing = false;
                this.gameActive = true;
                this.updateCurrentBox();
                console.log('🔓 JOGO DESBLOQUEADO');
            }
        }
    },
    
    /**
     * Trata vitória
     */
    handleWin() {
        console.log('🎉 VITÓRIA!');
        this.isProcessing = false;
        this.gameActive = false;
        this.clearGameState(); // Limpar jogo em andamento
        
        // Atualizar estatísticas
        this.stats.gamesPlayed++;
        this.stats.wins++;
        this.stats.currentStreak++;
        if (this.stats.currentStreak > this.stats.bestStreak) {
            this.stats.bestStreak = this.stats.currentStreak;
        }
        // Distribuição: currentRow é a linha onde acertou (0-indexado)
        const attemptIndex = Math.min(this.currentRow, 5);
        this.stats.distribution[attemptIndex]++;
        this.saveStats();
        this.updateStreakBadge();
        
        setTimeout(() => {
            this.showResult(true);
        }, 500);
    },
    
    /**
     * Trata derrota
     */
    handleLoss() {
        console.log('💔 GAME OVER');
        this.isProcessing = false;
        this.gameActive = false;
        this.clearGameState(); // Limpar jogo em andamento
        
        // Atualizar estatísticas
        this.stats.gamesPlayed++;
        this.stats.currentStreak = 0;
        this.saveStats();
        this.updateStreakBadge();
        
        setTimeout(() => {
            this.showResult(false);
        }, 500);
    },
    
    /**
     * Mostra tela de resultado
     */
    showResult(isWin) {
        this.elements.result.style.display = 'flex';
        
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const whatsappBtn = document.getElementById('whatsappShareBtn');
        
        if (isWin) {
            resultIcon.classList.remove('error');
            resultIcon.innerHTML = '<i class="fas fa-heart"></i>';
            resultTitle.textContent = 'Parabéns! 🎉';
            resultMessage.innerHTML = `
                <strong>A palavra era: ${this.currentWord}</strong><br><br>
                ${this.currentMessage}
            `;
            // Mostrar botão do WhatsApp
            if (whatsappBtn) {
                whatsappBtn.style.display = 'flex';
                whatsappBtn.onclick = () => this.shareOnWhatsApp();
            }
        } else {
            resultIcon.classList.add('error');
            resultIcon.innerHTML = '<i class="fas fa-heart-broken"></i>';
            resultTitle.textContent = 'Quase lá! 💔';
            resultMessage.innerHTML = `
                <strong>A palavra era: ${this.currentWord}</strong><br><br>
                Tente novamente com outra palavra!
            `;
            // Esconder botão do WhatsApp
            if (whatsappBtn) whatsappBtn.style.display = 'none';
        }
    },
    
    /**
     * Compartilha resultado no WhatsApp
     */
    shareOnWhatsApp() {
        const tentativas = this.guessHistory.length;
        const grid = this.guessHistory.join('\n');
        const mensagem = `🎮 Jogo de Palavras\n\n"❤️ Acertei em ${tentativas} tentativa${tentativas > 1 ? 's' : ''}!"\n\n${grid}\n\nKevin & Iara 💜`;
        const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
    },
    
    /**
     * Atualiza o badge de streak na interface
     */
    updateStreakBadge() {
        const badge = document.getElementById('streakBadge');
        const countEl = document.getElementById('streakCount');
        if (!badge || !countEl) return;
        
        countEl.textContent = this.stats.currentStreak;
        
        if (this.stats.currentStreak >= 3) {
            badge.classList.add('streak-hot');
        } else {
            badge.classList.remove('streak-hot');
        }
    },
    
    /**
     * Carrega estatísticas do localStorage
     */
    loadStats() {
        try {
            const saved = localStorage.getItem('wordGameStats');
            if (saved) {
                const p = JSON.parse(saved);
                this.stats = {
                    gamesPlayed: p.gamesPlayed || 0,
                    wins: p.wins || 0,
                    currentStreak: p.currentStreak || 0,
                    bestStreak: p.bestStreak || 0,
                    distribution: Array.isArray(p.distribution) && p.distribution.length === 6
                        ? p.distribution : [0, 0, 0, 0, 0, 0]
                };
            } else {
                // Migra streak simples antigo, se existir
                const old = parseInt(localStorage.getItem('wordGameStreak') || '0', 10);
                if (old > 0) {
                    this.stats.currentStreak = old;
                    this.saveStats();
                }
            }
        } catch(e) {
            console.warn('⚠️ Erro ao carregar estatísticas:', e);
        }
    },
    
    /**
     * Salva estatísticas no localStorage
     */
    saveStats() {
        try {
            localStorage.setItem('wordGameStats', JSON.stringify(this.stats));
        } catch(e) {
            console.warn('⚠️ Erro ao salvar estatísticas:', e);
        }
    },
    
    /**
     * Abre o painel de estatísticas
     */
    showStats() {
        const overlay = document.getElementById('wgStatsOverlay');
        if (!overlay) return;
        
        const { gamesPlayed, wins, currentStreak, bestStreak, distribution } = this.stats;
        const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
        const maxDist = Math.max(...distribution, 1);
        
        document.getElementById('statGamesPlayed').textContent = gamesPlayed;
        document.getElementById('statWinRate').textContent = winRate + '%';
        document.getElementById('statCurrentStreak').textContent = currentStreak;
        document.getElementById('statBestStreak').textContent = bestStreak;
        
        for (let i = 1; i <= 6; i++) {
            const count = distribution[i - 1];
            const bar = document.getElementById('distBar' + i);
            const widthPct = count > 0 ? Math.max((count / maxDist) * 100, 12) : 5;
            if (bar) {
                bar.style.width = widthPct + '%';
                bar.querySelector('span').textContent = count;
                // Destaca a barra da última vitória
                bar.classList.toggle('dist-bar-win', count > 0 && i - 1 === Math.min(this.currentRow, 5) && wins > 0);
            }
        }
        
        overlay.style.display = 'flex';
        requestAnimationFrame(() => overlay.classList.add('wg-stats-visible'));
    },
    
    /**
     * Fecha o painel de estatísticas
     */
    closeStats() {
        const overlay = document.getElementById('wgStatsOverlay');
        if (!overlay) return;
        overlay.classList.remove('wg-stats-visible');
        setTimeout(() => { overlay.style.display = 'none'; }, 250);
    },
    
    /**
     * Animação de shake na linha
     */
    shakeRow(row) {
        const boxes = this.elements.grid.querySelectorAll(`[data-row="${row}"]`);
        boxes.forEach(box => {
            box.style.animation = 'shake 0.5s';
        });
        
        setTimeout(() => {
            boxes.forEach(box => {
                box.style.animation = '';
            });
        }, 500);
    }
};

// ===== INTEGRAÇÃO COM MENU =====
function connectWordGameToMenu() {
    console.log('🔗 Conectando jogo ao menu...');
    
    const gameLink = document.querySelector('a[href="#jogo"]');
    
    if (!gameLink) {
        console.warn('⚠️ Link do jogo não encontrado no menu');
        return;
    }
    
    gameLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('🎮 Clique no menu - abrindo jogo');
        
        // Fechar menu
        const sideMenu = document.getElementById('sideMenu');
        const menuOverlay = document.getElementById('menuOverlay');
        const hamburgerBtn = document.getElementById('hamburgerBtn');
        
        if (sideMenu && menuOverlay && hamburgerBtn) {
            hamburgerBtn.classList.remove('active');
            sideMenu.classList.remove('active');
            menuOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        
        // Abrir jogo
        setTimeout(() => WordGame.openGame(), 300);
    });
    
    console.log('✅ Jogo conectado ao menu');
}

// ===== INTEGRAÇÃO COM HISTÓRICO DO NAVEGADOR =====
if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
        const currentState = typeof HistoryManager !== 'undefined' 
            ? HistoryManager.getCurrentState() 
            : null;
        
        if (currentState === 'word-game-modal') {
            const modal = document.getElementById('wordGameModal');
            if (modal && modal.style.display === 'flex') {
                WordGame.closeGame();
            }
        }
    });
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 DOMContentLoaded - inicializando sistema');
    
    // Inicializar com delay para aguardar Firebase
    const initWordGame = () => {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.log('⏳ Aguardando Firebase...');
            setTimeout(initWordGame, 500);
            return;
        }
        
        WordGame.init();
        connectWordGameToMenu();
        
        console.log('✅ Sistema de Jogo de Palavras 100% carregado');
    };
    
    setTimeout(initWordGame, 1000);
});

// ===== EXPOR GLOBALMENTE =====
if (typeof window !== 'undefined') {
    window.WordGame = WordGame;
}

console.log('🎮 word-game.js carregado com sucesso!');