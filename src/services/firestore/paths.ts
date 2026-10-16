/**
 * ATENÇÃO CRÍTICA DE SEGURANÇA:
 * NUNCA virar VITE_DATA_LAYOUT=site em produção antes de reescrevermos as firestore.rules!
 * As regras atuais do Firestore deixam leitura/escrita sob 'sites/' aberta para qualquer
 * usuário autenticado ou anônimo, o que exporia player_tokens, game_records e player_links.
 * 
 * Este arquivo define a camada de abstração de caminhos do Firestore para suportar
 * a transição gradual para a arquitetura multi-site:
 * - 'legacy' (padrão): coleções na raiz do Firestore (ex: collection(db, 'timeline'))
 * - 'site': coleções aninhadas sob o site (ex: collection(db, 'sites', siteId, 'timeline'))
 */

import {
  collection,
  doc,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEFAULT_SITE_ID } from '../../config/defaults';
import { useSiteConfigStore } from '../../store/siteConfigStore';
import { useAuth } from '../../features/auth/AuthContext';

export type DataLayout = 'legacy' | 'site';

let layoutOverride: DataLayout | null = null;

/**
 * Permite sobrescrever o layout de dados em testes automatizados.
 */
export function _setDataLayoutForTesting(layout: DataLayout | null): void {
  layoutOverride = layout;
}

/**
 * Retorna o layout ativo ('legacy' por padrão ou 'site' se configurado via env).
 */
export function getDataLayout(): DataLayout {
  if (layoutOverride) {
    return layoutOverride;
  }
  return import.meta.env.VITE_DATA_LAYOUT === 'site' ? 'site' : 'legacy';
}

/**
 * Retorna o siteId ativo fora de componentes React (ex.: serviços, records, utilities).
 * Lê do store de configuração e usa DEFAULT_SITE_ID como fallback seguro.
 */
export function getCurrentSiteId(): string {
  const storeId = useSiteConfigStore.getState().config?.id;
  return storeId || DEFAULT_SITE_ID;
}

/**
 * Hook React para obter o siteId no contexto da aplicação.
 * Ordem de precedência: user?.siteId ?? config?.id ?? DEFAULT_SITE_ID
 */
export function useSiteId(): string {
  const { user } = useAuth();
  const config = useSiteConfigStore((s) => s.config);
  return user?.siteId ?? config?.id ?? DEFAULT_SITE_ID;
}

/**
 * Retorna true se o ID for de documento interno/placeholder (inicia com '_').
 */
export function isPlaceholderId(id: string): boolean {
  return id.startsWith('_');
}

/**
 * Filtra documentos ou objetos cujos IDs começam com '_' (ex: '_placeholder').
 */
export function filterPlaceholders<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => !isPlaceholderId(item.id));
}

/**
 * Retorna uma CollectionReference respeitando o layout de dados ativo.
 * - 'legacy': collection(db, name)
 * - 'site': collection(db, 'sites', siteId, name)
 * 
 * @param name Nome da coleção (ex: 'timeline', 'albums', 'game_records')
 * @param siteId ID do site opcional (se omitido, usa getCurrentSiteId())
 */
export function siteCollection(name: string, siteId?: string): CollectionReference<DocumentData> {
  if (getDataLayout() === 'site') {
    const targetSiteId = siteId || getCurrentSiteId();
    return collection(db, 'sites', targetSiteId, name);
  }
  return collection(db, name);
}

/**
 * Retorna uma DocumentReference respeitando o layout de dados ativo.
 * - Se `id` for fornecido:
 *   - 'legacy': doc(db, name, id)
 *   - 'site': doc(db, 'sites', siteId, name, id)
 * - Se `id` for omitido/undefined:
 *   - Cria uma nova referência com ID gerado automaticamente na coleção correspondente.
 * 
 * @param name Nome da coleção
 * @param id ID do documento opcional
 * @param siteId ID do site opcional (se omitido, usa getCurrentSiteId())
 */
export function siteDoc(name: string, id?: string, siteId?: string): DocumentReference<DocumentData> {
  if (getDataLayout() === 'site') {
    const targetSiteId = siteId || getCurrentSiteId();
    if (id) {
      return doc(db, 'sites', targetSiteId, name, id);
    }
    return doc(collection(db, 'sites', targetSiteId, name));
  }
  if (id) {
    return doc(db, name, id);
  }
  return doc(collection(db, name));
}
