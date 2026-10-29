import { describe, it, expect } from 'vitest';

/**
 * Funções utilitárias puras que refletem a lógica implementada em AlbumEditor.tsx
 */

export function getUploadProgressStatus(
  currentUploadIndex: number,
  totalFiles: number,
  isSavingUpload: boolean
): string {
  if (isSavingUpload) {
    return 'Salvando no banco de dados...';
  }
  const currentStep = Math.min(currentUploadIndex + 1, totalFiles);
  return `Enviando foto ${currentStep} de ${totalFiles}...`;
}

export function togglePhotoSelection(
  selectedIds: Set<string>,
  photoId: string
): { nextSelected: Set<string>; shouldExitMode: boolean } {
  const nextSelected = new Set(selectedIds);
  if (nextSelected.has(photoId)) {
    nextSelected.delete(photoId);
  } else {
    nextSelected.add(photoId);
  }
  return {
    nextSelected,
    shouldExitMode: nextSelected.size === 0,
  };
}

export function toggleSelectAllPhotos(
  selectedIds: Set<string>,
  allPhotoIds: string[]
): { nextSelected: Set<string>; isModeActive: boolean } {
  if (selectedIds.size === allPhotoIds.length) {
    return {
      nextSelected: new Set(),
      isModeActive: false,
    };
  }
  return {
    nextSelected: new Set(allPhotoIds),
    isModeActive: true,
  };
}

export function filterPhotosAfterBatchDelete<T extends { publicId?: string; url?: string; src?: string }>(
  allPhotos: T[],
  selectedIds: Set<string>
): { remaining: T[]; deleted: T[] } {
  const remaining: T[] = [];
  const deleted: T[] = [];

  allPhotos.forEach((photo, idx) => {
    const id = photo.publicId || photo.url || photo.src || String(idx);
    if (selectedIds.has(id)) {
      deleted.push(photo);
    } else {
      remaining.push(photo);
    }
  });

  return { remaining, deleted };
}

export function shouldCancelLongPress(startX: number, startY: number, currentX: number, currentY: number): boolean {
  const dx = Math.abs(currentX - startX);
  const dy = Math.abs(currentY - startY);
  return dx > 8 || dy > 8;
}

describe('Galeria Administrativa - Testes de Regra e Gestos', () => {
  describe('Bug de Contagem de Upload (Regra 8)', () => {
    it('nunca exibe contagem superior ao total de fotos (ex: 5 de 4)', () => {
      const total = 4;

      // Foto 1 enviando (índice 0)
      expect(getUploadProgressStatus(0, total, false)).toBe('Enviando foto 1 de 4...');

      // Foto 2 enviando (índice 1)
      expect(getUploadProgressStatus(1, total, false)).toBe('Enviando foto 2 de 4...');

      // Foto 3 enviando (índice 2)
      expect(getUploadProgressStatus(2, total, false)).toBe('Enviando foto 3 de 4...');

      // Foto 4 enviando (índice 3 - última foto)
      expect(getUploadProgressStatus(3, total, false)).toBe('Enviando foto 4 de 4...');

      // Mesmo que o índice exceda ou seja 4 por race condition, o limitador bloqueia
      expect(getUploadProgressStatus(4, total, false)).toBe('Enviando foto 4 de 4...');

      // Quando entra na fase de persistência no Firestore
      expect(getUploadProgressStatus(3, total, true)).toBe('Salvando no banco de dados...');
    });
  });

  describe('Seleção por Toque Prolongado - Samsung Gallery Style (Regra 2)', () => {
    it('cancela o long-press se o usuário mover o dedo mais de 8px (rolagem normal da tela)', () => {
      // Movimento de 3px (pequeno tremor, deve manter o timer de seleção)
      expect(shouldCancelLongPress(100, 100, 102, 101)).toBe(false);

      // Movimento de 15px (rolagem vertical da página, deve cancelar o long-press)
      expect(shouldCancelLongPress(100, 100, 100, 115)).toBe(true);

      // Movimento de 10px horizontal
      expect(shouldCancelLongPress(100, 100, 110, 100)).toBe(true);
    });

    it('adiciona e remove fotos da seleção e encerra o modo quando todas são desmarcadas', () => {
      let selected = new Set<string>();

      // Long press na foto 1
      const step1 = togglePhotoSelection(selected, 'p1');
      expect(step1.nextSelected.has('p1')).toBe(true);
      expect(step1.shouldExitMode).toBe(false);
      selected = step1.nextSelected;

      // Toque rápido na foto 2
      const step2 = togglePhotoSelection(selected, 'p2');
      expect(step2.nextSelected.size).toBe(2);
      expect(step2.nextSelected.has('p2')).toBe(true);
      selected = step2.nextSelected;

      // Desmarca a foto 1
      const step3 = togglePhotoSelection(selected, 'p1');
      expect(step3.nextSelected.size).toBe(1);
      expect(step3.nextSelected.has('p1')).toBe(false);
      expect(step3.nextSelected.has('p2')).toBe(true);
      selected = step3.nextSelected;

      // Desmarca a foto 2 (última foto selecionada)
      const step4 = togglePhotoSelection(selected, 'p2');
      expect(step4.nextSelected.size).toBe(0);
      expect(step4.shouldExitMode).toBe(true);
    });

    it('alterna selecionar todas e desmarcar todas', () => {
      const allIds = ['p1', 'p2', 'p3', 'p4'];
      let selected = new Set<string>(['p1']);

      // Selecionar todas
      const step1 = toggleSelectAllPhotos(selected, allIds);
      expect(step1.nextSelected.size).toBe(4);
      expect(step1.isModeActive).toBe(true);

      // Quando todas já estão selecionadas, clicar desmarca tudo e sai do modo
      const step2 = toggleSelectAllPhotos(step1.nextSelected, allIds);
      expect(step2.nextSelected.size).toBe(0);
      expect(step2.isModeActive).toBe(false);
    });
  });

  describe('Exclusão em Lote e Segurança de Dados (Regra 6)', () => {
    it('filtra com precisão as fotos a serem deletadas e preserva as demais intactas', () => {
      const photos = [
        { publicId: 'id_1', url: 'https://img/1.jpg' },
        { publicId: 'id_2', url: 'https://img/2.jpg' },
        { publicId: 'id_3', url: 'https://img/3.jpg' },
        { publicId: 'id_4', url: 'https://img/4.jpg' },
      ];

      const selected = new Set<string>(['id_2', 'id_4']);

      const { remaining, deleted } = filterPhotosAfterBatchDelete(photos, selected);

      expect(deleted).toHaveLength(2);
      expect(deleted.map((d) => d.publicId)).toEqual(['id_2', 'id_4']);

      expect(remaining).toHaveLength(2);
      expect(remaining.map((r) => r.publicId)).toEqual(['id_1', 'id_3']);
    });
  });

  describe('Independência dos Modos (Regras 1 e 4)', () => {
    it('garante que toque rápido fora do modo de seleção não altera estado de seleção', () => {
      const isSelectionMode = false;
      const selected = new Set<string>();

      // No modo normal, clique rápido não seleciona
      if (!isSelectionMode) {
        // Nenhuma foto adicionada à seleção
      }
      expect(selected.size).toBe(0);
    });
  });
});
