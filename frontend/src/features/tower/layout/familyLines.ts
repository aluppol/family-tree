import { type FamilyForest, branchesOf, weightOf } from './familyForest';
import type { NodeTone } from './towerTypes';

export const LINE_PALETTE_SIZE = 8;

export interface LineAssignment {
  readonly heads: readonly number[];
  readonly trunk: ReadonlySet<number>;
  readonly headIndexById: ReadonlyMap<number, number>;
}

interface TrunkWalk {
  readonly trunk: readonly number[];
  readonly splitId: number;
}

export function assignLines(forest: FamilyForest): LineAssignment {
  const foundingRoots = forest.roots.filter((rootId) => branchesOf(forest, rootId).length > 0);
  const [onlyRoot] = foundingRoots;
  if (foundingRoots.length !== 1 || onlyRoot === undefined) {
    return linesFromHeads(forest, foundingRoots, []);
  }
  const walk = walkTrunk(forest, onlyRoot);
  const splitBranches = [...branchesOf(forest, walk.splitId)].sort((first, second) => weightOf(forest, second) - weightOf(forest, first) || first - second);
  return splitBranches.length === 0 ? linesFromHeads(forest, [onlyRoot], []) : linesFromHeads(forest, splitBranches, walk.trunk);
}

export function toneOf(forest: FamilyForest, lines: LineAssignment, personId: number): NodeTone {
  if (forest.besideById.has(personId)) {
    return { kind: 'married-in' };
  }
  if (lines.trunk.has(personId)) {
    return { kind: 'trunk' };
  }
  const lineIndex = lines.headIndexById.get(personId);
  return lineIndex === undefined || lineIndex >= LINE_PALETTE_SIZE ? { kind: 'other' } : { kind: 'line', lineIndex };
}

function walkTrunk(forest: FamilyForest, rootId: number): TrunkWalk {
  const trunk = [rootId];
  let currentId = rootId;
  for (let [onlyBranch, ...rest] = branchesOf(forest, currentId); onlyBranch !== undefined && rest.length === 0; [onlyBranch, ...rest] = branchesOf(forest, currentId)) {
    currentId = onlyBranch;
    trunk.push(currentId);
  }
  return { trunk, splitId: currentId };
}

function linesFromHeads(forest: FamilyForest, heads: readonly number[], trunk: readonly number[]): LineAssignment {
  const headIndexById = new Map<number, number>();
  heads.forEach((headId, lineIndex) => {
    for (const memberId of descendantsInForest(forest, headId)) {
      headIndexById.set(memberId, lineIndex);
    }
  });
  return { heads, trunk: new Set(trunk), headIndexById };
}

function descendantsInForest(forest: FamilyForest, headId: number): number[] {
  const members = [headId];
  for (const memberId of members) {
    members.push(...branchesOf(forest, memberId));
  }
  return members;
}
