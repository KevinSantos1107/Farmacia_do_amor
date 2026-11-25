/**
 * scripts/build-dictionary.mjs
 *
 * Gera automaticamente `public/pt-5-letters.json` com palavras oficiais de
 * EXATAMENTE 5 letras do português brasileiro, no mesmo padrão profissional
 * usado por jogos como Letreco e Termo:
 *
 *  1. Base principal offline: Projeto VERO / LibreOffice (`dictionary-pt`:
 *     `index.dic` + `index.aff`), com expansão completa de regras Hunspell
 *     (PFX, SFX e produto cruzado PFX × SFX), respeitando `FORBIDDENWORD`.
 *  2. Complementos léxicos abertos (quando online): IME-USP (`br-utf8.txt`),
 *     `fserb/pt-br` (`lexico` e `conjugações`) e `pythonprobr/palavras`.
 *  3. Normalização e filtros rigorosos:
 *     - Mantém nomes próprios/topônimos dicionarizados (ex.: Viena, Índia, Egito, Pedro);
 *     - Descarta siglas puras / algarismos romanos em caixa alta (ex.: ABGLT, BNDES, CCCII);
 *     - Descarta palavras com hífen, apóstrofo, ponto ou números;
 *     - Garante exatamente 5 letras (`A-Z`) após remoção de acentos e cedilha.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pt from 'dictionary-pt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(__dirname, '..', 'public', 'pt-5-letters.json');

const PURE_PT_LETTERS_RE = /^[a-zA-ZáàãâéêíóõôúüçÁÀÃÂÉÊÍÓÕÔÚÜÇ]+$/;

const EXTERNAL_SOURCES = [
  {
    name: 'IME-USP (br-utf8.txt)',
    url: 'https://www.ime.usp.br/~pf/dicios/br-utf8.txt',
  },
  {
    name: 'fserb/pt-br (lexico)',
    url: 'https://raw.githubusercontent.com/fserb/pt-br/master/lexico',
  },
  {
    name: 'fserb/pt-br (conjugações)',
    url: 'https://raw.githubusercontent.com/fserb/pt-br/master/conjugações',
  },
  {
    name: 'pythonprobr/palavras',
    url: 'https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt',
  },
];

function normalizeWord(word) {
  return word
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
}

function isPureAcronymOrRoman(rawWord) {
  return (
    rawWord.length >= 2 &&
    rawWord === rawWord.toUpperCase() &&
    rawWord !== rawWord.toLowerCase()
  );
}

function addCandidate(dictSet, rawWord) {
  const trimmed = rawWord.trim();
  if (!trimmed || !PURE_PT_LETTERS_RE.test(trimmed)) return;
  if (isPureAcronymOrRoman(trimmed)) return;
  const normalized = normalizeWord(trimmed);
  if (normalized.length === 5) {
    dictSet.add(normalized);
  }
}

function parseAffixRules(affContent) {
  const pfx = new Map();
  const sfx = new Map();
  let forbiddenFlag = '';

  for (const rawLine of affContent.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    const cmd = parts[0];

    if (cmd === 'FORBIDDENWORD' && parts[1]) {
      forbiddenFlag = parts[1];
      continue;
    }

    if ((cmd === 'PFX' || cmd === 'SFX') && parts.length >= 4) {
      const flag = parts[1];
      const map = cmd === 'PFX' ? pfx : sfx;

      if (parts[2] === 'Y' || parts[2] === 'N') {
        if (!map.has(flag)) {
          map.set(flag, { cross: parts[2] === 'Y', rules: [] });
        }
      } else {
        const group = map.get(flag);
        if (!group) continue;
        const strip = parts[2] === '0' ? '' : parts[2];
        const addRaw = parts[3].split('/')[0];
        const add = addRaw === '0' ? '' : addRaw;
        const cond = parts[4] || '.';
        const condRe =
          cond === '.'
            ? null
            : new RegExp(cmd === 'PFX' ? `^${cond}` : `${cond}$`);
        group.rules.push({ strip, add, condRe });
      }
    }
  }

  return { pfx, sfx, forbiddenFlag };
}

function expandVeroDictionary(dictSet) {
  const affText = pt.aff.toString('utf8');
  const dicText = pt.dic.toString('utf8');
  const { pfx, sfx, forbiddenFlag } = parseAffixRules(affText);
  const dicLines = dicText.split(/\r?\n/);

  for (let i = 1; i < dicLines.length; i++) {
    const line = dicLines[i].trim();
    if (!line) continue;

    const slashIdx = line.indexOf('/');
    const base = slashIdx === -1 ? line : line.slice(0, slashIdx);
    const flags = slashIdx === -1 ? '' : line.slice(slashIdx + 1);

    if (forbiddenFlag && flags.includes(forbiddenFlag)) continue;
    if (!PURE_PT_LETTERS_RE.test(base)) continue;

    const candidates = new Set([base]);
    const crossPrefixes = [];

    for (const flag of flags) {
      const sfxGroup = sfx.get(flag);
      if (sfxGroup) {
        for (const r of sfxGroup.rules) {
          if (
            (!r.condRe || r.condRe.test(base)) &&
            (!r.strip || base.endsWith(r.strip))
          ) {
            const stem = r.strip ? base.slice(0, -r.strip.length) : base;
            candidates.add(stem + r.add);
          }
        }
      }

      const pfxGroup = pfx.get(flag);
      if (pfxGroup) {
        for (const r of pfxGroup.rules) {
          if (
            (!r.condRe || r.condRe.test(base)) &&
            (!r.strip || base.startsWith(r.strip))
          ) {
            const stem = r.strip ? base.slice(r.strip.length) : base;
            const prefixed = r.add + stem;
            candidates.add(prefixed);
            if (pfxGroup.cross) {
              crossPrefixes.push(prefixed);
            }
          }
        }
      }
    }

    if (crossPrefixes.length > 0) {
      for (const flag of flags) {
        const sfxGroup = sfx.get(flag);
        if (!sfxGroup || !sfxGroup.cross) continue;
        for (const prefixed of crossPrefixes) {
          for (const r of sfxGroup.rules) {
            if (
              (!r.condRe || r.condRe.test(prefixed)) &&
              (!r.strip || prefixed.endsWith(r.strip))
            ) {
              const stem = r.strip
                ? prefixed.slice(0, -r.strip.length)
                : prefixed;
              candidates.add(stem + r.add);
            }
          }
        }
      }
    }

    for (const candidate of candidates) {
      addCandidate(dictSet, candidate);
    }
  }
}

async function fetchExternalSources(dictSet) {
  for (const source of EXTERNAL_SOURCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(source.url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        console.warn(`[dict:build] Aviso: ${source.name} retornou HTTP ${res.status}`);
        continue;
      }

      const text = await res.text();
      const before = dictSet.size;
      for (const line of text.split(/\r?\n/)) {
        addCandidate(dictSet, line);
      }
      console.log(`[dict:build] +${dictSet.size - before} palavras de ${source.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[dict:build] Aviso: não foi possível baixar ${source.name} (${msg})`);
    }
  }
}

async function main() {
  const dictSet = new Set();

  expandVeroDictionary(dictSet);
  console.log(`[dict:build] VERO (dictionary-pt): ${dictSet.size} palavras de 5 letras`);

  await fetchExternalSources(dictSet);

  const sorted = [...dictSet].sort();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(sorted), 'utf8');

  const sizeKb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`[dict:build] Salvo em ${OUTPUT_PATH}: ${sorted.length} palavras (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error('[dict:build] Erro fatal:', err);
  process.exit(1);
});
