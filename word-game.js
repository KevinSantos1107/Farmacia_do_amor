// ===== JOGO DE PALAVRAS - SISTEMA COMPLETO E PROFISSIONAL =====
// Versão otimizada e corrigida - 100% funcional - ADAPTÁVEL A PALAVRAS GRANDES

console.log('🎮 Sistema de Jogo de Palavras carregado');

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
    
    // Dados
    words: [],
    usedWordIds: new Set(),
    
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
        
        // Teclado virtual
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
        
        console.log('✅ Eventos configurados');
    },
    
    /**
     * Carrega palavras do Firebase
     */
    async loadWordsFromFirebase() {
        // Verifica se Firebase está disponível
        if (typeof db === 'undefined') {
            console.warn('⚠️ Firebase não está inicializado - usando palavras padrão');
            this.loadDefaultWords();
            return;
        }
        
        try {
            console.log('📥 Carregando palavras do Firebase...');
            const snapshot = await db.collection('word_game').orderBy('createdAt', 'asc').get();
            
            if (snapshot.empty) {
                console.log('ℹ️ Nenhuma palavra no Firebase - usando palavras padrão');
                this.loadDefaultWords();
                return;
            }
            
            this.words = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Validação de dados
                if (data.palavra && data.pergunta && data.mensagem) {
                    this.words.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            console.log(`✅ ${this.words.length} palavras carregadas do Firebase`);
            
            // Fallback se não houver palavras válidas
            if (this.words.length === 0) {
                this.loadDefaultWords();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar palavras:', error);
            this.loadDefaultWords();
        }
    },
    
    /**
     * Carrega palavras padrão (fallback)
     */
    loadDefaultWords() {
        this.words = [
            {
                id: 'default-1',
                pergunta: 'O que mais gosto em você?',
                palavra: 'SORRISO',
                mensagem: '✨ É isso que eu mais amo em você!'
            },
            {
                id: 'default-2',
                pergunta: 'O que sinto quando estou com você?',
                palavra: 'FELIZ',
                mensagem: '💕 Você me faz sentir completo!'
            },
            {
                id: 'default-3',
                pergunta: 'Como foi nosso primeiro encontro?',
                palavra: 'MAGICO',
                mensagem: '🌟 Foi mágico desde o primeiro momento!'
            },
            {
                id: 'default-4',
                pergunta: 'O que você é para mim?',
                palavra: 'TUDO',
                mensagem: '❤️ Você é tudo que eu sempre quis!'
            },
            {
                id: 'default-5',
                pergunta: 'O que quero construir com você?',
                palavra: 'FUTURO',
                mensagem: '🏡 Quero todos os meus dias ao seu lado!'
            },
            {
                id: 'default-6',
                pergunta: 'Como você me faz sentir?',
                palavra: 'AMADO',
                mensagem: '💖 Com você me sinto especial!'
            },
            {
                id: 'default-7',
                pergunta: 'O que é a nossa relação?',
                palavra: 'PERFEITA',
                mensagem: '🌹 Perfeita do jeito que é!'
            }
        ];
        
        console.log('✅ Palavras padrão carregadas');
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
        
        this.startNewGame();
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
     * Inicia uma nova rodada
     */
    startNewGame() {
        console.log('🎮 === INICIANDO NOVA RODADA ===');
        
        // Reset completo do estado
        this.currentRow = 0;
        this.currentCol = 0;
        this.gameActive = true;
        this.isProcessing = false;
        this.keyboardState = {};
        
        console.log('✅ Estado resetado');
        
        // Escolher palavra aleatória não jogada
        const availableWords = this.words.filter(w => !this.usedWordIds.has(w.id));
        
        // Se já jogou todas, resetar lista
        if (availableWords.length === 0) {
            console.log('🔄 Todas as palavras jogadas - resetando lista');
            this.usedWordIds.clear();
            return this.startNewGame();
        }
        
        // Selecionar palavra aleatória
        const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        
        this.currentWord = this.normalizeWord(randomWord.palavra);
        this.currentQuestion = randomWord.pergunta;
        this.currentMessage = randomWord.mensagem;
        this.wordLength = this.currentWord.length;
        
        this.usedWordIds.add(randomWord.id);
        
        console.log(`🎯 Palavra escolhida: "${this.currentWord}" (${this.wordLength} letras)`);
        
        // Atualizar UI
        this.elements.questionElement.textContent = this.currentQuestion;
        
        // Criar grid
        this.createGrid();
        
        // Resetar teclado
        this.resetKeyboard();
        
        // Esconder resultado
        this.elements.result.style.display = 'none';
        
        console.log('✅ Nova rodada pronta - JOGO ATIVO');
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
     * Cria o grid de letras com tamanho adaptável
     */
    createGrid() {
        this.elements.grid.innerHTML = '';
        
        // ✅ ADICIONA CLASSE DINÂMICA BASEADA NO TAMANHO DA PALAVRA
        // Remove classes antigas
        this.elements.grid.className = 'word-game-grid';
        
        // Adiciona classe específica do tamanho
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
                rowDiv.appendChild(box);
            }
            
            fragment.appendChild(rowDiv);
        }
        
        this.elements.grid.appendChild(fragment);
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
        boxes.forEach(box => box.classList.remove('current'));
        
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
     * Adiciona letra na posição atual
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
            this.currentCol++;
            this.updateCurrentBox();
        }
    },
    
    /**
     * Remove letra da posição atual
     */
    deleteLetter() {
        if (this.currentCol === 0) return;
        
        this.currentCol--;
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
     * Submete tentativa
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
        
        if (this.currentCol !== this.wordLength) {
            console.log('🚫 BLOQUEADO: Palavra incompleta');
            this.shakeRow(this.currentRow);
            return;
        }
        
        this.isProcessing = true;
        this.gameActive = false;
        console.log('🔒 JOGO BLOQUEADO - Processando...');
        
        // Obter tentativa
        const guess = this.getGuess(this.currentRow);
        console.log(`📝 Tentativa: "${guess}" | Resposta: "${this.currentWord}"`);
        
        // Avaliar tentativa (anima as cores)
        this.evaluateGuess(guess);
        
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
        
        if (isWin) {
            resultIcon.classList.remove('error');
            resultIcon.innerHTML = '<i class="fas fa-heart"></i>';
            resultTitle.textContent = 'Parabéns! 🎉';
            resultMessage.innerHTML = `
                <strong>A palavra era: ${this.currentWord}</strong><br><br>
                ${this.currentMessage}
            `;
        } else {
            resultIcon.classList.add('error');
            resultIcon.innerHTML = '<i class="fas fa-heart-broken"></i>';
            resultTitle.textContent = 'Quase lá! 💔';
            resultMessage.innerHTML = `
                <strong>A palavra era: ${this.currentWord}</strong><br><br>
                Tente novamente com outra palavra!
            `;
        }
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
    },
    
    /**
     * Mostra mensagem toast
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'word-game-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-family: 'Poppins', sans-serif;
            font-size: 0.95rem;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
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

// ===== ADICIONAR ESTILOS DE ANIMAÇÃO =====
function injectStyles() {
    if (document.getElementById('word-game-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'word-game-animations';
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes popIn {
            0% {
                transform: scale(0.8);
                opacity: 0;
            }
            50% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📦 DOMContentLoaded - inicializando sistema');
    
    // Injetar estilos
    injectStyles();
    
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