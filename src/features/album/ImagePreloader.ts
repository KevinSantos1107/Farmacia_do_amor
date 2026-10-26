class ImagePreloaderQueue {
  private queue: string[] = [];
  private loading = false;
  private cache = new Set<string>();

  /**
   * Define a nova lista de prioridade de preloading.
   * A PRIMEIRA URL da lista é a mais urgente (geralmente a foto que o usuário já vê).
   * Substituímos toda a fila para garantir que a mais prioritária não fique atrás de
   * outras que estavam enfileiradas antes.
   * Se já há um download em andamento, iniciamos um carregamento paralelo imediato
   * para a URL mais importante (download direto no cache do browser).
   */
  setPriority(urls: string[]) {
    // Filtra apenas as que não estão no cache ainda
    const toLoad = urls.filter(u => !this.cache.has(u));
    if (toLoad.length === 0) return;
    
    // Substitui a fila atual pela nova prioridade
    this.queue = toLoad;
    
    // Se já estamos carregando outra URL, dispara a mais prioritária em paralelo
    // (o browser vai baixar as duas ao mesmo tempo; a prioritária chega ao cache primeiro).
    if (this.loading && toLoad[0]) {
      this._warmImmediately(toLoad[0]);
    }

    this.process();
  }

  /**
   * Dispara um `new Image()` imediatamente para a URL mais prioritária, em paralelo
   * com qualquer download já em andamento. O resultado vai direto para o cache do browser.
   * Quando o preloader sequencial chegar a essa URL, o `img.complete` já será `true`.
   */
  private _warmImmediately(url: string) {
    if (this.cache.has(url)) return;
    const img = new Image();
    if ('decoding' in img) img.decoding = 'async';
    img.onload = () => { this.cache.add(url); };
    img.onerror = () => {};
    img.src = url;
  }

  /**
   * Limpa a fila pendente de preloading (chamado ao fechar o modal ou desmontar).
   */
  clear() {
    this.queue = [];
  }

  private async process() {
    if (this.loading || this.queue.length === 0) return;
    this.loading = true;
    
    while (this.queue.length > 0) {
      // Pega a URL de maior prioridade (início do array)
      const url = this.queue.shift();
      if (!url || this.cache.has(url)) continue;
      
      try {
        await this.loadImage(url);
        this.cache.add(url);
      } catch {
        // Ignora erro e continua a fila (pode ser problema de rede temporário)
      }
    }
    
    this.loading = false;
  }

  private loadImage(url: string): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      // Timeout de segurança: no iOS/Safari com 4G/5G oscilando, evita que uma
      // imagem pendente trave a fila inteira indefinidamente.
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          img.onload = null;
          img.onerror = null;
          img.src = '';
          resolve();
        }
      }, 8000);

      // Decodificação assíncrona evita travar a main thread e picos de GPU no iOS/Safari
      if ('decoding' in img) {
        img.decoding = 'async';
      }

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          img.onload = null;
          img.onerror = null;
          resolve();
        }
      };

      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          img.onload = null;
          img.onerror = null;
          img.src = '';
          resolve(); // Resolve mesmo com erro para não travar a fila
        }
      };

      img.src = url;
    });
  }
}

export const imagePreloader = new ImagePreloaderQueue();
