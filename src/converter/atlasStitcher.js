/**
 * Texture Atlas Stitcher
 *
 * Takes MC texture references (resolved to data URLs or blob URLs),
 * stitches them onto a single canvas, and returns:
 *   - atlasDataUrl: base64 PNG of the atlas
 *   - uvMap: per-texture pixel offsets in Hytale textureLayout format
 *            { key: { offset: {x, y}, size: {x, y} } }
 *
 * Atlas is always power-of-two and a multiple of 32 (Hytale prop density).
 * Default target: 128×128. Grows to 256×256 if textures overflow.
 */

const TILE_SIZE = 16; // standard MC texture tile

function nextPow2Multiple32(n) {
  let v = 32;
  while (v < n) v = v * 2;
  return v;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load texture: ${src}`));
    img.src = src;
  });
}

/**
 * @param {Record<string, string>} textureUrls  key → data URL or object URL
 * @returns {Promise<{ atlasDataUrl: string, uvMap: Record<string, {offset:{x,y}, size:{x,y}}> }>}
 */
export async function createAtlas(textureUrls) {
  const entries = Object.entries(textureUrls);
  if (entries.length === 0) {
    // Return a 16×16 magenta placeholder
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, 16, 16);
    return { atlasDataUrl: canvas.toDataURL(), uvMap: {} };
  }

  // Load all images first so we can measure them
  const loaded = [];
  for (const [key, url] of entries) {
    try {
      const img = await loadImage(url);
      loaded.push({ key, img });
    } catch {
      console.warn(`[Atlas] Skipping texture "${key}" — could not load`);
    }
  }

  // Simple row-packing: sort by height desc, pack left-to-right
  const cols = Math.ceil(Math.sqrt(loaded.length));
  const tileW = loaded[0]?.img.width  ?? TILE_SIZE;
  const tileH = loaded[0]?.img.height ?? TILE_SIZE;

  const rawW = cols * tileW;
  const rawH = Math.ceil(loaded.length / cols) * tileH;
  const atlasSize = Math.max(nextPow2Multiple32(rawW), nextPow2Multiple32(rawH));

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = atlasSize;
  const ctx = canvas.getContext('2d');

  const uvMap = {};
  loaded.forEach(({ key, img }, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = col * tileW;
    const py = row * tileH;
    ctx.drawImage(img, px, py);
    // Hytale textureLayout uses pixel offsets, not normalised UVs
    uvMap[key] = {
      offset: { x: px, y: py },
      size:   { x: img.width, y: img.height },
    };
  });

  return { atlasDataUrl: canvas.toDataURL('image/png'), uvMap };
}
