import type { ConstellationShape } from './types';

// ─────────────────────────────────────────────
//  CONSTELLATION DATABASE
//  Relative coords (x: -1..1, y: -1..1)
//  mag: 1=small dim, 2=medium, 3=bright main star
//  lines: pairs of star indices to connect
// ─────────────────────────────────────────────
export const CONSTELLATION_DB: Record<string, ConstellationShape> = {
  // ── ÓRION / ORION ──────────────────────────
  ORION: {
    stars: [
      { x: -0.40, y: -0.65, mag: 3 }, // 0 Betelgeuse
      { x:  0.40, y: -0.58, mag: 2 }, // 1 Bellatrix
      { x: -0.12, y: -0.05, mag: 2 }, // 2 Alnitak
      { x:  0.00, y: -0.00, mag: 2 }, // 3 Alnilam
      { x:  0.12, y:  0.05, mag: 2 }, // 4 Mintaka
      { x: -0.28, y:  0.70, mag: 2 }, // 5 Saiph
      { x:  0.38, y:  0.72, mag: 3 }, // 6 Rigel
      { x: -0.55, y: -0.25, mag: 1 }, // 7 Pi3 Ori (left arm)
      { x:  0.55, y: -0.22, mag: 1 }, // 8 Pi1 Ori (right arm)
    ],
    lines: [[0,1],[0,2],[1,4],[0,7],[1,8],[2,3],[3,4],[2,5],[4,6],[5,6]],
  },
  // ── TOURO / TAURUS ──────────────────────────
  TAURUS: {
    stars: [
      { x:  0.00, y:  0.00, mag: 3 }, // 0 Aldebaran (eye)
      { x: -0.30, y: -0.20, mag: 2 }, // 1 Ain
      { x: -0.55, y: -0.35, mag: 1 }, // 2 Hyadum I
      { x: -0.15, y:  0.20, mag: 2 }, // 3 Theta2 Tau
      { x:  0.25, y:  0.35, mag: 1 }, // 4 Tianguan
      { x: -0.60, y:  0.50, mag: 2 }, // 5 Elnath (tip of horn)
      { x:  0.60, y:  0.50, mag: 2 }, // 6 Zeta Tau (tip of horn 2)
      { x: -0.80, y: -0.60, mag: 2 }, // 7 Pleiades center (asterism)
    ],
    lines: [[0,1],[1,2],[0,3],[3,4],[1,5],[0,6],[2,7]],
  },
  // ── GÊMEOS / GEMINI ─────────────────────────
  GEMINI: {
    stars: [
      { x: -0.35, y: -0.80, mag: 3 }, // 0 Castor (head 1)
      { x:  0.35, y: -0.80, mag: 3 }, // 1 Pollux (head 2)
      { x: -0.30, y: -0.30, mag: 2 }, // 2 Alhena
      { x:  0.30, y: -0.30, mag: 2 }, // 3 Wasat
      { x: -0.20, y:  0.10, mag: 1 }, // 4
      { x:  0.20, y:  0.10, mag: 1 }, // 5
      { x: -0.25, y:  0.55, mag: 2 }, // 6 Mebsuda
      { x:  0.25, y:  0.55, mag: 2 }, // 7 Propus
      { x: -0.15, y:  0.80, mag: 1 }, // 8 Foot Castor
      { x:  0.30, y:  0.80, mag: 2 }, // 9 Foot Pollux
    ],
    lines: [[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],[2,3]],
  },
  // ── CÃO MAIOR / CANIS MAJOR ─────────────────
  'CAO MAIOR': {
    stars: [
      { x:  0.00, y: -0.40, mag: 3 }, // 0 Sirius (brightest)
      { x: -0.25, y: -0.65, mag: 2 }, // 1 Adhara
      { x:  0.30, y: -0.60, mag: 2 }, // 2 Mirzam
      { x:  0.00, y:  0.10, mag: 1 }, // 3 Wezen area
      { x: -0.20, y:  0.40, mag: 2 }, // 4 Wezen
      { x:  0.25, y:  0.50, mag: 2 }, // 5 Aludra
      { x: -0.35, y:  0.70, mag: 1 }, // 6 Omicron1
      { x:  0.40, y: -0.10, mag: 1 }, // 7 Furud
    ],
    lines: [[0,1],[0,2],[0,3],[3,4],[3,5],[4,6],[5,7],[1,4],[2,7]],
  },
  // ── CÃO MENOR / CANIS MINOR ─────────────────
  'CAO MENOR': {
    stars: [
      { x:  0.00, y: -0.30, mag: 3 }, // 0 Procyon
      { x:  0.25, y:  0.40, mag: 2 }, // 1 Gomeisa
    ],
    lines: [[0,1]],
  },
  // ── LEÃO / LEO ──────────────────────────────
  LEO: {
    stars: [
      { x: -0.45, y: -0.50, mag: 3 }, // 0 Regulus
      { x: -0.20, y: -0.65, mag: 2 }, // 1 Eta Leo
      { x:  0.10, y: -0.75, mag: 2 }, // 2 Algieba
      { x:  0.40, y: -0.55, mag: 1 }, // 3 Zosma
      { x:  0.60, y: -0.20, mag: 2 }, // 4 Denebola
      { x:  0.50, y:  0.15, mag: 1 }, // 5 Chort
      { x:  0.00, y:  0.10, mag: 1 }, // 6 Theta Leo
      { x: -0.40, y:  0.00, mag: 2 }, // 7 Adhafera
      { x: -0.55, y: -0.25, mag: 1 }, // 8 Epsilon Leo
    ],
    lines: [[0,8],[8,7],[7,2],[2,1],[1,0],[2,3],[3,4],[4,5],[5,6],[6,7]],
  },
  // ── ESCORPIÃO / SCORPIUS ─────────────────────
  ESCORPIAO: {
    stars: [
      { x:  0.00, y: -0.70, mag: 3 }, // 0 Antares (heart)
      { x: -0.25, y: -0.50, mag: 2 }, // 1 Acrab
      { x:  0.25, y: -0.50, mag: 2 }, // 2 Dschubba
      { x: -0.40, y: -0.20, mag: 1 }, // 3
      { x:  0.40, y: -0.20, mag: 1 }, // 4
      { x: -0.20, y:  0.10, mag: 2 }, // 5 Tau Sco
      { x:  0.00, y:  0.30, mag: 1 }, // 6
      { x:  0.10, y:  0.55, mag: 2 }, // 7
      { x: -0.10, y:  0.75, mag: 2 }, // 8 Shaula area
      { x: -0.35, y:  0.85, mag: 3 }, // 9 Shaula (tail)
      { x:  0.35, y:  0.85, mag: 2 }, // 10 Lesath
    ],
    lines: [[1,0],[0,2],[1,3],[2,4],[0,5],[5,6],[6,7],[7,8],[8,9],[8,10]],
  },
  // ── VIRGEM / VIRGO ───────────────────────────
  VIRGO: {
    stars: [
      { x:  0.00, y: -0.10, mag: 3 }, // 0 Spica
      { x: -0.40, y: -0.50, mag: 2 }, // 1 Vindemiatrix
      { x: -0.60, y: -0.20, mag: 1 }, // 2
      { x: -0.30, y:  0.30, mag: 2 }, // 3 Porrima
      { x:  0.30, y:  0.20, mag: 1 }, // 4
      { x:  0.55, y: -0.30, mag: 2 }, // 5 Zavijava
      { x:  0.60, y:  0.55, mag: 1 }, // 6 Heze
      { x: -0.10, y:  0.65, mag: 1 }, // 7
    ],
    lines: [[0,3],[0,4],[3,1],[1,2],[3,7],[4,5],[4,6],[0,7]],
  },
  // ── CÂNCER / CANCER ──────────────────────────
  CANCER: {
    stars: [
      { x:  0.00, y:  0.00, mag: 2 }, // 0 Acubens
      { x: -0.40, y: -0.35, mag: 2 }, // 1 Asellus Australis
      { x:  0.40, y: -0.35, mag: 2 }, // 2 Asellus Borealis
      { x: -0.55, y:  0.50, mag: 1 }, // 3 Beta Cnc
      { x:  0.55, y:  0.50, mag: 1 }, // 4 Iota Cnc
    ],
    lines: [[3,1],[1,0],[0,2],[2,4],[1,2]],
  },
  // ── AQUÁRIO / AQUARIUS ───────────────────────
  AQUARIUS: {
    stars: [
      { x:  0.00, y: -0.60, mag: 2 }, // 0 Sadalsuud
      { x:  0.30, y: -0.30, mag: 2 }, // 1 Sadalmelik
      { x: -0.30, y: -0.10, mag: 1 }, // 2 Albali
      { x:  0.00, y:  0.10, mag: 1 }, // 3
      { x:  0.20, y:  0.40, mag: 1 }, // 4
      { x: -0.20, y:  0.55, mag: 1 }, // 5
      { x:  0.00, y:  0.70, mag: 2 }, // 6 Sadachbia
      { x:  0.45, y:  0.80, mag: 1 }, // 7
    ],
    lines: [[0,1],[0,2],[1,3],[3,4],[3,5],[4,6],[5,6],[6,7]],
  },
  // ── PEIXES / PISCES ──────────────────────────
  PISCES: {
    stars: [
      { x: -0.50, y: -0.30, mag: 2 }, // 0 Eta Psc
      { x: -0.30, y: -0.60, mag: 1 }, // 1
      { x:  0.00, y: -0.70, mag: 1 }, // 2
      { x:  0.30, y: -0.50, mag: 1 }, // 3
      { x:  0.55, y: -0.20, mag: 2 }, // 4 Alrescha
      { x:  0.50, y:  0.20, mag: 1 }, // 5
      { x:  0.30, y:  0.55, mag: 1 }, // 6
      { x: -0.10, y:  0.70, mag: 1 }, // 7
      { x: -0.50, y:  0.50, mag: 1 }, // 8
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,0]],
  },
  // ── ÁRIES / ARIES ────────────────────────────
  ARIES: {
    stars: [
      { x: -0.30, y:  0.10, mag: 3 }, // 0 Hamal
      { x:  0.10, y: -0.10, mag: 2 }, // 1 Sheratan
      { x:  0.50, y: -0.20, mag: 1 }, // 2 Mesarthim
      { x: -0.60, y:  0.50, mag: 1 }, // 3 Bharani
    ],
    lines: [[0,1],[1,2],[0,3]],
  },
  // ── SAGITÁRIO / SAGITTARIUS ──────────────────
  SAGITTARIUS: {
    stars: [
      { x:  0.00, y: -0.20, mag: 3 }, // 0 Kaus Australis
      { x: -0.25, y: -0.50, mag: 2 }, // 1 Kaus Medius
      { x: -0.45, y: -0.70, mag: 2 }, // 2 Kaus Borealis
      { x:  0.30, y: -0.60, mag: 2 }, // 3 Nunki
      { x:  0.55, y: -0.30, mag: 1 }, // 4 Ascella
      { x:  0.50, y:  0.20, mag: 1 }, // 5 Phi Sgr
      { x:  0.00, y:  0.40, mag: 2 }, // 6 Rukbat
      { x: -0.40, y:  0.20, mag: 1 }, // 7 Alnasl
      { x: -0.55, y:  0.50, mag: 1 }, // 8
    ],
    lines: [[0,1],[1,2],[0,3],[0,4],[4,5],[0,7],[7,8],[1,7],[2,1],[3,4]],
  },
  // ── CAPRICÓRNIO / CAPRICORNUS ────────────────
  CAPRICORNUS: {
    stars: [
      { x: -0.55, y: -0.40, mag: 2 }, // 0 Algedi
      { x: -0.30, y: -0.55, mag: 2 }, // 1 Dabih
      { x:  0.20, y: -0.60, mag: 1 }, // 2
      { x:  0.55, y: -0.40, mag: 1 }, // 3
      { x:  0.55, y:  0.20, mag: 2 }, // 4 Deneb Algedi
      { x:  0.20, y:  0.55, mag: 1 }, // 5
      { x: -0.20, y:  0.60, mag: 1 }, // 6
      { x: -0.55, y:  0.30, mag: 1 }, // 7
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[1,7]],
  },
  // ── CASSIOPEIA ───────────────────────────────
  CASSIOPEIA: {
    stars: [
      { x: -0.80, y:  0.20, mag: 2 }, // 0 Segin
      { x: -0.40, y: -0.30, mag: 2 }, // 1 Ruchbah
      { x:  0.00, y:  0.10, mag: 3 }, // 2 Gamma (middle)
      { x:  0.40, y: -0.30, mag: 2 }, // 3 Schedar
      { x:  0.80, y:  0.20, mag: 2 }, // 4 Caph
    ],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  // ── URSA MAIOR / URSA MAJOR ──────────────────
  'URSA MAIOR': {
    stars: [
      { x: -0.65, y: -0.30, mag: 2 }, // 0 Dubhe
      { x: -0.40, y: -0.50, mag: 2 }, // 1 Merak
      { x: -0.10, y: -0.45, mag: 2 }, // 2 Phecda
      { x:  0.10, y: -0.20, mag: 2 }, // 3 Megrez
      { x:  0.40, y:  0.10, mag: 2 }, // 4 Alioth
      { x:  0.65, y:  0.30, mag: 2 }, // 5 Mizar
      { x:  0.80, y:  0.55, mag: 2 }, // 6 Alkaid
    ],
    lines: [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]],
  },
  // ── URSA MENOR / URSA MINOR ──────────────────
  'URSA MENOR': {
    stars: [
      { x:  0.00, y: -0.80, mag: 3 }, // 0 Polaris
      { x:  0.20, y: -0.40, mag: 2 }, // 1 Kochab
      { x:  0.40, y:  0.00, mag: 1 }, // 2
      { x:  0.50, y:  0.40, mag: 2 }, // 3
      { x:  0.20, y:  0.55, mag: 1 }, // 4
      { x: -0.10, y:  0.70, mag: 2 }, // 5
      { x: -0.30, y:  0.50, mag: 2 }, // 6
    ],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]],
  },
  // ── CRUX / CRUZEIRO DO SUL ───────────────────
  CRUX: {
    stars: [
      { x:  0.00, y: -0.70, mag: 3 }, // 0 Acrux (bottom)
      { x:  0.00, y:  0.70, mag: 3 }, // 1 Gacrux (top)
      { x: -0.70, y:  0.00, mag: 2 }, // 2 Delta Cru (left)
      { x:  0.70, y:  0.00, mag: 2 }, // 3 Beta Cru (right)
      { x:  0.30, y:  0.30, mag: 1 }, // 4 Epsilon Cru
    ],
    lines: [[0,1],[2,3],[4,1]],
  },
  // ── HÉRCULES / HERCULES ──────────────────────
  HERCULES: {
    stars: [
      { x:  0.00, y: -0.70, mag: 2 }, // 0 Rasalgethi
      { x: -0.15, y: -0.35, mag: 1 }, // 1
      { x:  0.15, y: -0.35, mag: 1 }, // 2
      { x: -0.40, y:  0.00, mag: 2 }, // 3 Kornephoros
      { x:  0.40, y:  0.00, mag: 2 }, // 4 Zeta Her
      { x: -0.30, y:  0.40, mag: 1 }, // 5
      { x:  0.30, y:  0.40, mag: 1 }, // 6
      { x: -0.50, y:  0.70, mag: 2 }, // 7 Sarin
      { x:  0.50, y:  0.70, mag: 2 }, // 8
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[3,4],[5,6]],
  },
  // ── LIRA / LYRA ──────────────────────────────
  LYRA: {
    stars: [
      { x:  0.00, y: -0.70, mag: 3 }, // 0 Vega
      { x: -0.30, y: -0.10, mag: 2 }, // 1 Sulafat
      { x:  0.30, y: -0.10, mag: 2 }, // 2 Sheliak
      { x: -0.35, y:  0.40, mag: 1 }, // 3 Delta1 Lyr
      { x:  0.35, y:  0.40, mag: 1 }, // 4 Delta2 Lyr
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[1,2],[3,4]],
  },
  // ── CISNE / CYGNUS ───────────────────────────
  CYGNUS: {
    stars: [
      { x:  0.00, y: -0.80, mag: 3 }, // 0 Deneb
      { x:  0.00, y: -0.20, mag: 2 }, // 1 Sadr
      { x: -0.70, y: -0.20, mag: 2 }, // 2 Gienah
      { x:  0.70, y: -0.20, mag: 2 }, // 3 Delta Cyg
      { x:  0.00, y:  0.70, mag: 2 }, // 4 Albireo
    ],
    lines: [[0,1],[1,4],[2,3],[1,2],[1,3]],
  },
  // ── LEBRE / LEPUS ────────────────────────────
  LEPUS: {
    stars: [
      { x: -0.30, y: -0.60, mag: 2 }, // 0 Arneb
      { x:  0.25, y: -0.50, mag: 2 }, // 1 Nihal
      { x: -0.55, y: -0.10, mag: 1 }, // 2
      { x:  0.55, y:  0.00, mag: 1 }, // 3
      { x: -0.30, y:  0.50, mag: 1 }, // 4
      { x:  0.30, y:  0.60, mag: 1 }, // 5
    ],
    lines: [[0,2],[0,1],[1,3],[2,4],[4,5],[3,5],[0,4],[1,5]],
  },
  // ── ANDRÔMEDA / ANDROMEDA ────────────────────
  ANDROMEDA: {
    stars: [
      { x: -0.55, y:  0.10, mag: 2 }, // 0 Alpheratz
      { x: -0.20, y: -0.20, mag: 2 }, // 1 Mirach
      { x:  0.20, y: -0.50, mag: 2 }, // 2 Almach
      { x:  0.55, y: -0.70, mag: 1 }, // 3
      { x: -0.30, y:  0.50, mag: 1 }, // 4
    ],
    lines: [[0,1],[1,2],[2,3],[0,4]],
  },
  // ── PERSEU / PERSEUS ─────────────────────────
  PERSEUS: {
    stars: [
      { x:  0.00, y: -0.60, mag: 3 }, // 0 Mirfak
      { x: -0.25, y: -0.30, mag: 2 }, // 1 Algol
      { x: -0.50, y: -0.05, mag: 1 }, // 2
      { x:  0.30, y: -0.25, mag: 2 }, // 3 Zeta Per
      { x:  0.55, y:  0.10, mag: 1 }, // 4
      { x:  0.20, y:  0.45, mag: 2 }, // 5 Epsilon Per
      { x: -0.15, y:  0.65, mag: 1 }, // 6
    ],
    lines: [[0,1],[1,2],[0,3],[3,4],[0,5],[5,6],[3,5]],
  },
  // ── AGUIA / AQUILA ───────────────────────────
  AGUIA: {
    stars: [
      { x:  0.00, y: -0.15, mag: 3 }, // 0 Altair
      { x: -0.30, y: -0.00, mag: 2 }, // 1 Tarazed
      { x:  0.30, y: -0.00, mag: 2 }, // 2 Alshain
      { x: -0.10, y:  0.45, mag: 1 }, // 3
      { x:  0.10, y:  0.45, mag: 1 }, // 4
      { x:  0.00, y:  0.70, mag: 2 }, // 5 Lambda Aql
    ],
    lines: [[1,0],[0,2],[0,3],[0,4],[3,5],[4,5]],
  },
};
