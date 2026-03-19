/**
 * Minecraft Java block model parser.
 * Handles both flat models and models with parent references (partial).
 */

export function parseMcJson(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid JSON: ' + e.message);
  }

  return {
    parent:   json.parent   ?? null,
    textures: json.textures ?? {},
    elements: json.elements ?? [],
    display:  json.display  ?? {},
    groups:   json.groups   ?? [],
  };
}

export function parseBlockymodel(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid .blockymodel JSON: ' + e.message);
  }
  return json;
}
