/**
 * Pre-flight validator for Hytale .blockymodel output.
 * Runs before export to catch issues that will silently break the game.
 */

const MAX_NODES = 255;
const RESERVED_NAMES = new Set(['root', 'none', 'null', 'undefined']);

/** Count all nodes recursively (bones + boxes) */
function countNodes(nodes) {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node.children?.length) total += countNodes(node.children);
  }
  return total;
}

/** Collect all node names recursively */
function collectNames(nodes, out = []) {
  for (const node of nodes) {
    out.push(node.name ?? '');
    if (node.children?.length) collectNames(node.children, out);
  }
  return out;
}

/**
 * @param {object[]} nodes         - Top-level nodes array from the converted model
 * @param {number}   atlasWidth    - Width of the stitched texture atlas in px
 * @param {number}   atlasHeight   - Height of the stitched texture atlas in px
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function runPreFlightCheck(nodes, atlasWidth = 128, atlasHeight = 128) {
  const errors = [];
  const warnings = [];

  // 1. Node limit (recursive total)
  const total = countNodes(nodes);
  if (total > MAX_NODES) {
    errors.push(`CRITICAL: ${total} nodes — exceeds the 255-node Hytale engine limit.`);
  } else if (total > 200) {
    warnings.push(`Node count ${total} is approaching the 255 limit. Consider merging boxes.`);
  }

  // 2. Texture atlas dimensions — must be power-of-two and multiple of 32
  const isPow2 = n => n > 0 && (n & (n - 1)) === 0;
  if (!isPow2(atlasWidth) || !isPow2(atlasHeight)) {
    errors.push(`CRITICAL: Atlas dimensions ${atlasWidth}×${atlasHeight} must be power-of-two.`);
  }
  if (atlasWidth % 32 !== 0 || atlasHeight % 32 !== 0) {
    warnings.push(`Atlas dimensions should be multiples of 32 for Hytale prop density.`);
  }

  // 3. Reserved node names
  const names = collectNames(nodes);
  for (const name of names) {
    if (RESERVED_NAMES.has(name.toLowerCase())) {
      errors.push(`ERROR: Node name "${name}" is a reserved Hytale keyword.`);
    }
    if (name === '') {
      warnings.push('A node has an empty name — may cause issues in Blocky Studio.');
    }
  }

  // 4. Duplicate names warning
  const seen = new Set();
  for (const name of names) {
    if (seen.has(name)) warnings.push(`Duplicate node name "${name}" — animations may behave unexpectedly.`);
    seen.add(name);
  }

  return { valid: errors.length === 0, errors, warnings, nodeCount: total };
}
