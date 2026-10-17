import { describe, it, expect, beforeEach } from 'vitest';
import { lockBodyScroll, _resetScrollLockForTesting } from './scrollLock';

describe('scrollLock', () => {
  let fakeBody: { style: { overflow: string } };
  let fakeHtml: { style: { overflow: string } };

  beforeEach(() => {
    fakeBody = { style: { overflow: '' } };
    fakeHtml = { style: { overflow: '' } };

    globalThis.document = {
      body: fakeBody as unknown as HTMLElement,
      documentElement: fakeHtml as unknown as HTMLElement,
    } as unknown as Document;

    _resetScrollLockForTesting();
  });

  it('bloqueia body e html ao solicitar o primeiro lock', () => {
    expect(fakeBody.style.overflow).toBe('');
    expect(fakeHtml.style.overflow).toBe('');

    const unlock = lockBodyScroll();
    expect(fakeBody.style.overflow).toBe('hidden');
    expect(fakeHtml.style.overflow).toBe('hidden');

    unlock();
    expect(fakeBody.style.overflow).toBe('');
    expect(fakeHtml.style.overflow).toBe('');
  });

  it('mantém o lock ativo quando múltiplos componentes solicitam lock simultaneamente', () => {
    const unlockMenu = lockBodyScroll();
    expect(fakeBody.style.overflow).toBe('hidden');

    const unlockModal = lockBodyScroll();
    expect(fakeBody.style.overflow).toBe('hidden');

    // Menu fecha (como acontece ao clicar para abrir um jogo a partir do menu hambúrguer)
    unlockMenu();
    // O modal continua aberto, portanto a página deve PERMANECER bloqueada
    expect(fakeBody.style.overflow).toBe('hidden');
    expect(fakeHtml.style.overflow).toBe('hidden');

    // Modal fecha
    unlockModal();
    expect(fakeBody.style.overflow).toBe('');
    expect(fakeHtml.style.overflow).toBe('');
  });

  it('ignora chamadas repetidas da mesma função de unlock (idempotência)', () => {
    const unlock = lockBodyScroll();
    expect(fakeBody.style.overflow).toBe('hidden');

    unlock();
    expect(fakeBody.style.overflow).toBe('');

    // Chamar unlock novamente não deve gerar contagem negativa ou efeitos colaterais
    unlock();
    expect(fakeBody.style.overflow).toBe('');
  });
});
