#!/usr/bin/env node
/**
 * warm-cloudinary.mjs — "Aquece" as fotos dos álbuns no Cloudinary.
 *
 * PARA QUE SERVE
 *   O Cloudinary só gera cada versão de uma imagem (tamanho/formato) na PRIMEIRA vez que
 *   alguém a pede. Essa primeira vez é lenta, e quem paga é o primeiro visitante — no seu caso,
 *   o iPhone. Este script faz esse primeiro pedido por você, para todas as fotos, de uma vez.
 *   Depois disso, qualquer aparelho recebe a imagem já pronta, do cache.
 *
 * COMO USAR (na pasta do projeto, com Node 22+ — não precisa instalar nada):
 *   node scripts/warm-cloudinary.mjs --dry-run     # só conta quantas imagens, sem baixar
 *   node scripts/warm-cloudinary.mjs               # aquece de verdade (ou: npm run warm)
 *
 * OPÇÕES
 *   --dry-run          lista o que seria aquecido e mostra ONDE as fotos antigas estão hospedadas
 *   --analyze          baixa também as fotos antigas (links externos) e mede tamanho e tempo de cada uma
 *   --no-covers        não aquece as capas dos álbuns (só as fotos)
 *   --concurrency=N    pedidos simultâneos (padrão 3; suba com cuidado)
 *
 * IMPORTANTE: a transformação usada aqui precisa ser IDÊNTICA à do site
 * (src/features/album/photoUrl.ts → w_1200,c_limit,q_auto,f_webp,fl_progressive).
 * Se um dia mudar a largura/formato no site, mude PHOTO_TRANSFORM abaixo e rode de novo.
 *
 * Este script só LÊ o Firestore (as regras já permitem leitura pública) e só faz GET no
 * Cloudinary. Não altera nem apaga nada.
 */
import fs from 'node:fs';
import path from 'node:path';

// ─── Configuração ────────────────────────────────────────────────────────────

// Lê o .env da raiz (se existir) sem precisar de nenhum pacote
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // sem .env → usa os padrões abaixo
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const WITH_COVERS = !args.includes('--no-covers');
const ANALYZE = args.includes('--analyze');
const concArg = args.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Math.min(8, parseInt(concArg?.split('=')[1] ?? '3', 10) || 3));

const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCgt_eD3M_n9bhuhSzOxpf5f_ck43ZZZ-o';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'kevin-iara-site';
const CLOUD_NAME = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'dxxnqs4gf';

const FIRESTORE_BASE =
  process.env.WARM_FIRESTORE_BASE ||
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const CLOUDINARY_BASE = process.env.WARM_CLOUDINARY_BASE || `https://res.cloudinary.com/${CLOUD_NAME}`;

// Mesma transformação de cloudinaryUrl({ w: 1200, f: 'webp' }) do site
const PHOTO_TRANSFORM = 'w_1200,c_limit,q_auto,f_webp,fl_progressive';
const PHOTO_ACCEPT = 'image/webp,image/*;q=0.8,*/*;q=0.5';

// Capas: o carrossel usa f_auto (o formato depende do navegador), por isso pedimos com
// dois "Accept" diferentes (navegadores que aceitam AVIF e os que só aceitam WebP).
const COVER_WIDTHS = [300, 480, 600];
const COVER_ACCEPTS = [
  'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'image/webp,image/apng,image/*,*/*;q=0.8',
];

const REQUEST_TIMEOUT_MS = 120_000; // a 1ª geração pode ser lenta; damos até 2 min por imagem
const RETRIES = 2;

// ─── Firestore REST (somente leitura) ────────────────────────────────────────

function decodeValue(val) {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in val) {
    const out = {};
    for (const k in val.mapValue.fields || {}) out[k] = decodeValue(val.mapValue.fields[k]);
    return out;
  }
  return val;
}

function decodeDoc(doc) {
  const id = (doc.name || '').split('/').pop();
  const data = {};
  for (const k in doc.fields || {}) data[k] = decodeValue(doc.fields[k]);
  return { id, data };
}

async function listAll(collectionId) {
  const docs = [];
  let pageToken;
  for (let page = 0; page < 200; page++) {
    let url = `${FIRESTORE_BASE}/${collectionId}?key=${API_KEY}&pageSize=100`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore respondeu ${res.status} ao ler "${collectionId}"`);
    const json = await res.json();
    docs.push(...(json.documents || []));
    pageToken = json.nextPageToken;
    if (!pageToken) return docs.map(decodeDoc).filter((d) => !d.id.startsWith('_'));
  }
  throw new Error(`Muitas páginas em "${collectionId}"`);
}

// ─── Monta a lista de URLs ───────────────────────────────────────────────────

function buildJobs(albums, photoPages) {
  const jobs = [];
  const seen = new Set();
  let externalPhotos = 0;
  const externals = new Set();

  const add = (url, accept, label, external = false) => {
    const key = `${url}|${accept}`;
    if (seen.has(key)) return;
    seen.add(key);
    jobs.push({ url, accept, label, external });
  };

  for (const page of photoPages) {
    for (const p of Array.isArray(page.data.photos) ? page.data.photos : []) {
      const id = p && p.publicId;
      if (id && !String(id).startsWith('http')) {
        add(`${CLOUDINARY_BASE}/image/upload/${PHOTO_TRANSFORM}/${id}`, PHOTO_ACCEPT, `foto ${id}`);
      } else {
        externalPhotos++;
        // Mesma prioridade de getPhotoUrl() no site: é este link que o modal abre
        const u = p && (p.srcWebP || p.src || p.srcLarge || p.url || p.publicId);
        if (u) externals.add(String(u));
      }
    }
  }

  if (WITH_COVERS) {
    for (const album of albums) {
      const id = album.data.coverPublicId;
      if (!id) continue;
      // 300 é a largura usada por getCover(); [300,480,600] formam o srcset do carrossel
      for (const w of COVER_WIDTHS) {
        for (const accept of COVER_ACCEPTS) {
          add(`${CLOUDINARY_BASE}/image/upload/w_${w},c_limit,q_auto,f_auto,fl_progressive/${id}`, accept, `capa ${id} (${w}px)`);
        }
      }
    }
  }

  if (ANALYZE) {
    for (const u of externals) add(u, PHOTO_ACCEPT, `antiga ${hostOf(u)} ${u.slice(-40)}`, true);
  }

  return { jobs, externalPhotos, externals: [...externals] };
}

function hostOf(u) {
  try {
    return new URL(u).host;
  } catch {
    return '(link inválido)';
  }
}

function printHosts(externals) {
  const byHost = new Map();
  for (const u of externals) {
    const h = hostOf(u);
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(u);
  }
  console.log('\nOnde estão hospedadas as fotos antigas (as que o site abre no iPhone):');
  for (const [h, list] of [...byHost].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${list.length} fotos em ${h}`);
    console.log(`     exemplo: ${list[0].slice(0, 150)}`);
  }
}

// ─── Execução ────────────────────────────────────────────────────────────────

async function warmOne(job) {
  let lastErr = 'erro desconhecido';
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(job.url, { headers: { Accept: job.accept }, signal: controller.signal });
      // Lê o corpo inteiro: garante que o Cloudinary terminou de gerar/entregar a imagem
      const buf = await res.arrayBuffer();
      clearTimeout(timer);
      if (res.ok) return { ok: true, ms: Date.now() - started, bytes: buf.byteLength, type: res.headers.get('content-type') || '' };
      lastErr = `HTTP ${res.status}`;
      if (res.status === 404 || res.status === 401 || res.status === 403) break; // não adianta repetir
    } catch (e) {
      clearTimeout(timer);
      lastErr = e && e.name === 'AbortError' ? `sem resposta em ${REQUEST_TIMEOUT_MS / 1000}s` : String(e && e.message ? e.message : e);
    }
  }
  return { ok: false, error: lastErr };
}

async function main() {
  console.log(`Projeto Firebase: ${PROJECT_ID} | Cloudinary: ${CLOUD_NAME}`);
  console.log('Lendo álbuns e fotos no Firestore...');
  const [albums, photoPages] = await Promise.all([listAll('albums'), listAll('album_photos')]);

  const { jobs, externalPhotos, externals } = buildJobs(albums, photoPages);
  console.log(`${albums.length} álbuns, ${photoPages.length} páginas de fotos.`);
  const cldCount = jobs.filter((j) => !j.external).length;
  console.log(`${cldCount} imagens do Cloudinary para aquecer.`);
  if (externalPhotos > 0) {
    console.log(`${externalPhotos} fotos antigas usam link externo (não são geradas pelo Cloudinary).`);
    printHosts(externals);
    if (!ANALYZE) console.log('\nPara medir tamanho e tempo dessas fotos, rode com --analyze.');
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: nada foi baixado. Rode sem --dry-run para aquecer.');
    return 0;
  }
  if (jobs.length === 0) {
    console.log('Nada para aquecer.');
    return 0;
  }

  const results = [];
  let next = 0;
  let done = 0;
  const t0 = Date.now();

  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const r = await warmOne(job);
      done++;
      results.push({ job, ...r });
      const tag = r.ok ? `ok   ${(r.ms / 1000).toFixed(1)}s` : `FALHOU (${r.error})`;
      console.log(`[${done}/${jobs.length}] ${tag}  ${job.label}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const slowest = [...ok].sort((a, b) => b.ms - a.ms).slice(0, 5);

  console.log('\n──────── Resumo ────────');
  console.log(`Concluído em ${((Date.now() - t0) / 1000).toFixed(0)}s: ${ok.length} ok, ${failed.length} com falha.`);
  if (slowest.length) {
    console.log('Mais lentas (provavelmente estavam "a frio"):');
    for (const s of slowest) console.log(`  ${(s.ms / 1000).toFixed(1)}s  ${s.job.label}`);
  }
  const ext = ok.filter((r) => r.job.external);
  if (ext.length) {
    const kb = (b) => `${(b / 1024).toFixed(0)} KB`;
    console.log(`\n──────── Fotos antigas (${ext.length} medidas) ────────`);
    const byHost = new Map();
    for (const r of ext) {
      const h = hostOf(r.job.url);
      if (!byHost.has(h)) byHost.set(h, []);
      byHost.get(h).push(r);
    }
    for (const [h, list] of byHost) {
      const avgB = list.reduce((a, r) => a + r.bytes, 0) / list.length;
      const avgT = list.reduce((a, r) => a + r.ms, 0) / list.length;
      const maxB = Math.max(...list.map((r) => r.bytes));
      console.log(`  ${h}: ${list.length} fotos | tamanho médio ${kb(avgB)} | maior ${kb(maxB)} | tempo médio ${(avgT / 1000).toFixed(1)}s`);
    }
    const big = ext.filter((r) => r.bytes > 1024 * 1024);
    console.log(`  Fotos acima de 1 MB: ${big.length} de ${ext.length}`);
    console.log(`  Fotos acima de 500 KB: ${ext.filter((r) => r.bytes > 500 * 1024).length} de ${ext.length}`);
    console.log('  Maiores:');
    for (const r of [...ext].sort((a, b) => b.bytes - a.bytes).slice(0, 5)) {
      console.log(`    ${kb(r.bytes)}  ${(r.ms / 1000).toFixed(1)}s  ${r.type}  ${r.job.url.slice(0, 110)}`);
    }
  }

  if (failed.length) {
    console.log('Falhas:');
    for (const f of failed) console.log(`  ${f.job.label} → ${f.error}`);
    console.log('\nÉ seguro rodar o script de novo: o que já está pronto responde rápido e só o restante demora.');
    return 1;
  }
  console.log(ANALYZE ? 'Análise concluída.' : 'Pronto! Agora as fotos já estão geradas no Cloudinary.');
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`\nErro: ${err && err.message ? err.message : err}`);
    process.exitCode = 1;
  }
);
