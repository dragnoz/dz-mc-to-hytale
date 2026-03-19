/**
 * DZ MC to Hytale Converter — Core Engine
 *
 * Converts Minecraft Java block model JSON into Hytale .blockymodel format.
 *
 * Key corrections vs generic docs:
 *   - Positions are {x,y,z} objects, NOT arrays
 *   - Rotation is quaternion {x,y,z,w}, NOT euler
 *   - Box size lives at shape.settings.size {x,y,z}
 *   - Box offset from node pivot lives at shape.offset {x,y,z}
 *   - Per-face UVs: textureLayout.{front/back/left/right/top/bottom}.offset {x,y}
 *   - Output root: { nodes: [...], lod: "auto" }  — NO "format" field
 *   - Hard limit: 255 total nodes per model
 */

const MAX_NODES = 255;

// ── Math helpers ────────────────────────────────────────────────────────────

function vec3(x, y, z) { return { x, y, z }; }
function identityQuat() { return { x: 0, y: 0, z: 0, w: 1 }; }

/** Centre point of a MC [from, to] box */
function centre(from, to) {
  return vec3(
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  );
}

/** Size of a MC element */
function size(from, to) {
  return vec3(
    Math.abs(to[0] - from[0]),
    Math.abs(to[1] - from[1]),
    Math.abs(to[2] - from[2]),
  );
}

/**
 * Subtract two vec3 objects — used for relative positioning.
 * PosHytale = PosAbsolute - PivotParent
 */
function subVec3(a, b) {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ── UV helpers ───────────────────────────────────────────────────────────────

const FACE_NAMES = ['front', 'back', 'left', 'right', 'up', 'down'];
const MC_TO_HYTALE_FACE = { north: 'front', south: 'back', west: 'left', east: 'right', up: 'top', down: 'bottom' };

function buildTextureLayout(faces) {
  const layout = {};
  for (const [mcFace, htFace] of Object.entries(MC_TO_HYTALE_FACE)) {
    const f = faces?.[mcFace];
    layout[htFace] = {
      offset: f?.uv ? { x: f.uv[0], y: f.uv[1] } : { x: 0, y: 0 },
      mirror: { x: false, y: false },
      angle: 0,
    };
  }
  return layout;
}

// ── Node builder ─────────────────────────────────────────────────────────────

let _nodeId = 1;
function nextId() { return String(_nodeId++); }

function makeBoxNode(element, parentPivot) {
  const c = centre(element.from, element.to);
  const s = size(element.from, element.to);
  const offset = subVec3(c, parentPivot); // relative to parent bone pivot

  return {
    id: nextId(),
    name: element.__name || 'box',
    position: vec3(0, 0, 0), // child position relative to bone — offset carries this
    orientation: identityQuat(),
    shape: {
      type: 'box',
      offset,
      stretch: vec3(1, 1, 1),
      settings: { isPiece: false, size: s },
      textureLayout: buildTextureLayout(element.faces),
      unwrapMode: 'custom',
      visible: true,
      doubleSided: false,
      shadingMode: 'flat',
    },
    children: [],
  };
}

// ── Pivot / bone builder ──────────────────────────────────────────────────────

function bboxPivot(elements) {
  if (elements.length === 0) return vec3(8, 0, 8);
  const minX = Math.min(...elements.map(e => e.from[0]));
  const minY = Math.min(...elements.map(e => e.from[1]));
  const minZ = Math.min(...elements.map(e => e.from[2]));
  const maxX = Math.max(...elements.map(e => e.to[0]));
  const maxZ = Math.max(...elements.map(e => e.to[2]));
  return vec3((minX + maxX) / 2, minY, (minZ + maxZ) / 2);
}

function makeBoneNode(name, elements) {
  const pivot = bboxPivot(elements);
  return {
    id: nextId(),
    name: name || 'Bone',
    position: pivot,
    orientation: identityQuat(),
    shape: {
      type: 'none',
      offset: vec3(0, 0, 0),
      stretch: vec3(1, 1, 1),
      settings: { isPiece: true },
      textureLayout: {},
      unwrapMode: 'custom',
      visible: true,
      doubleSided: false,
      shadingMode: 'flat',
    },
    children: elements.map(e => makeBoxNode(e, pivot)),
  };
}

/**
 * Build hierarchy from MC groups array (recursive — groups can contain sub-groups).
 * Falls back to a single root bone if no groups defined.
 */
function buildHierarchy(mcGroups, elements) {
  if (!mcGroups || mcGroups.length === 0) {
    return [makeBoneNode('Root', elements)];
  }

  return mcGroups.map(group => {
    if (typeof group === 'number') return null; // ungrouped element index — skip at this level

    const directElements = (group.children ?? [])
      .filter(c => typeof c === 'number')
      .map(i => elements[i])
      .filter(Boolean);

    const subGroups = (group.children ?? []).filter(c => typeof c === 'object');

    const bone = makeBoneNode(group.name ?? 'Bone', directElements);

    if (subGroups.length > 0) {
      bone.children = [
        ...bone.children,
        ...buildHierarchy(subGroups, elements),
      ];
    }

    return bone;
  }).filter(Boolean);
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Convert a Minecraft Java block model JSON object to a Hytale .blockymodel object.
 *
 * @param {object} mcJson   - Parsed MC model JSON
 * @param {string} name     - Model name (used for root bone)
 * @returns {{ model: object, warnings: string[] }}
 */
export function convertMcToHytale(mcJson, name = 'Model') {
  _nodeId = 1;
  const warnings = [];

  const elements = mcJson.elements ?? [];
  if (elements.length === 0) {
    warnings.push('No elements found in Minecraft model.');
    return { model: { nodes: [], lod: 'auto' }, warnings };
  }

  // Name each element
  elements.forEach((e, i) => { e.__name = `box_${i}`; });

  const nodes = buildHierarchy(mcJson.groups ?? [], elements);
  if (nodes.length === 1) nodes[0].name = name;

  // Node count (recursive) — validator does the full check, this is a quick warn
  function countAll(ns) { return ns.reduce((t, n) => t + 1 + countAll(n.children ?? []), 0); }
  const totalNodes = countAll(nodes);
  if (totalNodes > MAX_NODES) {
    warnings.push(`Node count ${totalNodes} exceeds the 255-node Hytale limit. Model may fail engine validation.`);
  }

  const model = {
    nodes,
    lod: 'auto',
  };

  return { model, warnings };
}

/**
 * Serialise a converted model to a .blockymodel JSON string.
 */
export function serialise(model) {
  return JSON.stringify(model, null, 2);
}
