/**
 * Acesso direto à API REST do Firestore (fetch simples), usado pelo álbum.
 *
 * Por que existe: no iPhone/Safari o SDK do Firestore roda em "long polling", que pode
 * levar muito tempo para responder. O REST direto responde em poucos segundos.
 *
 * Regras de segurança deste módulo:
 *  - Qualquer falha devolve `null` (nunca dados parciais), para quem chamou cair no
 *    fallback seguro do SDK em vez de exibir um álbum com fotos faltando.
 *  - Não exige nenhum índice composto no Firestore.
 */

export interface RawFirestoreDoc {
  name?: string;
  fields?: Record<string, unknown>;
}

function getRestConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCgt_eD3M_n9bhuhSzOxpf5f_ck43ZZZ-o';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  return { apiKey, baseUrl };
}

// Segurança contra loop infinito caso a API devolva tokens de página sem parar.
const MAX_PAGES = 50;
const PAGE_SIZE = 100;

/**
 * Lista TODOS os documentos de uma coleção da raiz, seguindo `nextPageToken`.
 * (A versão anterior lia só a primeira página de 100 documentos e ignorava o resto.)
 * Retorna `null` se qualquer página falhar.
 */
export async function listCollectionDocs(
  collectionId: string,
  signal?: AbortSignal
): Promise<RawFirestoreDoc[] | null> {
  const { apiKey, baseUrl } = getRestConfig();
  const docs: RawFirestoreDoc[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    let url = `${baseUrl}/${collectionId}?key=${apiKey}&pageSize=${PAGE_SIZE}`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await fetch(url, { signal, keepalive: true });
    if (!res.ok) return null;

    const json = (await res.json()) as { documents?: RawFirestoreDoc[]; nextPageToken?: string };
    if (Array.isArray(json.documents)) docs.push(...json.documents);

    pageToken = json.nextPageToken;
    if (!pageToken) return docs;
  }

  // Passou do limite de páginas: dados possivelmente incompletos → trata como falha.
  return null;
}

/**
 * Busca as "páginas de fotos" (documentos de `album_photos`) de UM álbum.
 * Usa só um filtro de igualdade (não precisa de índice composto); a ordenação por
 * `pageNumber` fica por conta de quem chama. Retorna `null` se a consulta falhar.
 */
export async function queryAlbumPhotoPages(
  albumId: string,
  signal?: AbortSignal
): Promise<RawFirestoreDoc[] | null> {
  const { apiKey, baseUrl } = getRestConfig();
  const res = await fetch(`${baseUrl}:runQuery?key=${apiKey}`, {
    method: 'POST',
    signal,
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'album_photos' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'albumId' },
            op: 'EQUAL',
            value: { stringValue: albumId },
          },
        },
      },
    }),
  });
  if (!res.ok) return null;

  const json: unknown = await res.json();
  if (!Array.isArray(json)) return null;

  // Cada item é { document, readTime }. Uma consulta sem resultados devolve só { readTime }.
  const docs: RawFirestoreDoc[] = [];
  for (const item of json as Array<{ document?: RawFirestoreDoc; error?: unknown }>) {
    if (item && item.error) return null; // erro embutido na resposta → deixa o fallback agir
    if (item && item.document) docs.push(item.document);
  }
  return docs;
}
