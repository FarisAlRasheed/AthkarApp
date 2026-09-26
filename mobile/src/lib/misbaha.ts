/**
 * The misbaha's string (DESIGN_PLAN §7.4), like a real one: counting beads, uncounted separators
 * between the groups, and the imam at the end of the round. Separators and the imam slide over
 * together with the bead that ends their group, so they mark the moment without being counted.
 */
export type Piece = 'bead' | 'separator' | 'imam';

export interface MisbahaString {
  /** Counting beads per round. */
  beads: number;
  /** One round of pieces, in order. */
  seq: Piece[];
  /** after[k]: position along `seq` once k beads have been counted (including any pieces right after). */
  after: number[];
}

/** Beads per round: the target up to 100; a 100-bead string for larger targets; 33 for no limit. */
export function stringFor(target: number | null): MisbahaString {
  const beads = target === null ? 33 : target <= 100 ? target : 100;
  const separators = new Set<number>();
  if (beads === 33) [11, 22].forEach((n) => separators.add(n));
  else if (beads > 33) for (let n = 33; n < beads; n += 33) separators.add(n);
  else if (beads >= 9 && beads % 3 === 0) [beads / 3, (beads * 2) / 3].forEach((n) => separators.add(n));

  const seq: Piece[] = [];
  const after = [0];
  for (let k = 1; k <= beads; k++) {
    seq.push('bead');
    if (separators.has(k)) seq.push('separator');
    if (k === beads) seq.push('imam');
    after.push(seq.length);
  }
  return { beads, seq, after };
}

/** Where along the (endless) string the count has reached. */
export function positionFor(count: number, s: MisbahaString): number {
  const rounds = Math.floor(count / s.beads);
  return rounds * s.seq.length + s.after[count % s.beads];
}

/** What slid over with the latest count: a bead alone, or a bead with a separator or the imam. */
export function crossed(count: number, s: MisbahaString): Piece {
  if (count <= 0) return 'bead';
  const k = count % s.beads === 0 ? s.beads : count % s.beads;
  const last = s.seq[s.after[k] - 1];
  return last;
}
