export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FallParticle = {
  id: number;
  leftPct: number;
  durationSec: number;
  delaySec: number;
  driftPx: number;
  sizePx: number;
  opacity: number;
  rotStart: number;
  glyph: string;
};

export function buildFallParticles(
  seedStr: string,
  count: number,
  pickGlyph: (rnd: () => number, index: number) => string,
): FallParticle[] {
  const rnd = mulberry32(seedFromString(seedStr) ^ 0x9e3779b9);
  const out: FallParticle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      leftPct: rnd() * 100,
      durationSec: 10 + rnd() * 16,
      delaySec: rnd() * 12,
      driftPx: (rnd() - 0.5) * 110,
      sizePx: 8 + rnd() * 11,
      opacity: 0.22 + rnd() * 0.42,
      rotStart: (rnd() - 0.5) * 40,
      glyph: pickGlyph(rnd, i),
    });
  }
  return out;
}
