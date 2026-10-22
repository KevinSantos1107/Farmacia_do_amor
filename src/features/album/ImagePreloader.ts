class ImagePreloaderQueue {
  private queue: string[] = [];
  private loading = false;
  private cache = new Set<string>();

  /**
   * Define a nova lista de prioridade de preloading.
   * As URLs passadas serão as próximas a serem carregadas, na ordem fornecida.
   */
  setPriority(urls: string[]) {
    // Filtra apenas as que não estão no cache ainda
    const toLoad = urls.filter(u => !this.cache.has(u));
    
    // Substitui a fila atual pela nova prioridade
    this.queue = toLoad;
    
    this.process();
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
      // Decodificação assíncrona evita travar a main thread e picos de GPU no iOS/Safari
      if ('decoding' in img) {
        img.decoding = 'async';
      }
      img.onload = () => {
        img.onload = null;
        img.onerror = null;
        resolve();
      };
      img.onerror = () => {
        img.onload = null;
        img.onerror = null;
        resolve(); // Resolve mesmo com erro para não travar a fila
      };
      img.src = url;
    });
  }
}

export const imagePreloader = new ImagePreloaderQueue();
