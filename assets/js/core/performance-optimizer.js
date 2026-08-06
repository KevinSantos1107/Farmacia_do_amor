// ===== SISTEMA DE OTIMIZAÇÃO DE PERFORMANCE =====

/**
 * 🚀 GERENCIADOR DE EVENT LISTENERS
 */
class EventManager {
    constructor() {
        this.listeners = new Map();
    }
    
    add(element, event, handler, options = {}) {
        if (!element) return;
        
        const key = this.getKey(element, event);
        
        if (this.listeners.has(key)) {
            this.remove(element, event);
        }
        
        element.addEventListener(event, handler, options);
        this.listeners.set(key, { handler, options });
    }
    
    remove(element, event) {
        if (!element) return;
        
        const key = this.getKey(element, event);
        const stored = this.listeners.get(key);
        
        if (stored) {
            element.removeEventListener(event, stored.handler, stored.options);
            this.listeners.delete(key);
        }
    }
    
    removeAll(element) {
        if (!element) return;
        
        const elementId = element.id || element.className;
        let removed = 0;
        
        for (const [key, stored] of this.listeners.entries()) {
            if (key.startsWith(elementId)) {
                const [, event] = key.split(':');
                element.removeEventListener(event, stored.handler, stored.options);
                this.listeners.delete(key);
                removed++;
            }
        }
    }
    
    clear() {
        this.listeners.clear();
    }
    
    getKey(element, event) {
        const id = element.id || element.className || 'elem';
        return `${id}:${event}`;
    }
}

window.eventManager = new EventManager();


/**
 * 🎨 GERENCIADOR DE DOM
 */
class DOMOptimizer {
    static updateText(element, newText) {
        if (!element) return;
        if (element.textContent !== newText) {
            element.textContent = newText;
        }
    }
    
    static updateAttribute(element, attr, value) {
        if (!element) return;
        if (element.getAttribute(attr) !== value) {
            element.setAttribute(attr, value);
        }
    }
    
    static updateClass(element, className, add = true) {
        if (!element) return;
        
        const has = element.classList.contains(className);
        
        if (add && !has) {
            element.classList.add(className);
        } else if (!add && has) {
            element.classList.remove(className);
        }
    }
    
    static batchUpdate(updates) {
        requestAnimationFrame(() => {
            updates.forEach(({ element, type, value }) => {
                switch(type) {
                    case 'text':
                        this.updateText(element, value);
                        break;
                    case 'class':
                        this.updateClass(element, value.name, value.add);
                        break;
                    case 'attr':
                        this.updateAttribute(element, value.name, value.value);
                        break;
                }
            });
        });
    }
}

window.DOMOptimizer = DOMOptimizer;


/**
 * 🔄 UTILITIES
 */
class PerformanceUtils {
    static debounce(func, wait = 300) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
    
    static throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

window.PerformanceUtils = PerformanceUtils;


/**
 * 🧹 MEMÓRIA
 */
class MemoryManager {
    constructor() {
        this.caches = new Map();
        this.maxCacheSize = 50;
    }
    
    setCache(key, value) {
        this.caches.set(key, value);
        
        if (this.caches.size > this.maxCacheSize) {
            const firstKey = this.caches.keys().next().value;
            this.caches.delete(firstKey);
        }
    }
    
    clearOldCaches(olderThan = 300000) {
        const now = Date.now();
        let cleared = 0;
        
        for (const [key, data] of this.caches.entries()) {
            if (data.timestamp && now - data.timestamp > olderThan) {
                this.caches.delete(key);
                cleared++;
            }
        }
    }
    
    clearAll() {
        this.caches.clear();
    }
}

window.memoryManager = new MemoryManager();


/**
 * 📊 MONITOR
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.enabled = false; // Desabilitado por padrão
    }
    
    measure(name, func) {
        if (!this.enabled) return func();
        
        const start = performance.now();
        const result = func();
        const end = performance.now();
        
        this.metrics.push({ 
            name, 
            duration: end - start, 
            timestamp: Date.now() 
        });
        
        return result;
    }
    
    getReport() {
        if (this.metrics.length === 0) return { operations: 0 };
        
        const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
        
        return {
            total: `${total.toFixed(2)}ms`,
            average: `${(total / this.metrics.length).toFixed(2)}ms`,
            operations: this.metrics.length
        };
    }
    
    clearOldMetrics() {
        const now = Date.now();
        this.metrics = this.metrics.filter(m => now - m.timestamp < 60000);
    }
}

window.perfMonitor = new PerformanceMonitor();


/**
 * 🎬 AUTO-LIMPEZA
 */
function setupAutoCleaning() {
    setInterval(() => {
        window.memoryManager.clearOldCaches();
        window.perfMonitor.clearOldMetrics();
    }, 300000);
}


/**
 * 📊 DIAGNÓSTICO
 */
window.diagnostico = function() {
    console.log('📊 RELATÓRIO');
    console.log('Listeners:', window.eventManager.listeners.size);
    console.log('Caches:', window.memoryManager.caches.size);
    console.table(window.perfMonitor.getReport());
};


/**
 * 🚀 INIT
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAutoCleaning);
} else {
    setupAutoCleaning();
}

console.log('⚡ Performance Optimizer OK');