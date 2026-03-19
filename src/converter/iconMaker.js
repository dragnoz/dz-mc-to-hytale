/**
 * Icon Maker — renders the current Three.js scene to a 64×64 PNG.
 * Hytale hard requirement: icon must be exactly 64×64.
 *
 * The renderer MUST be created with { preserveDrawingBuffer: true }
 * or toDataURL() returns a blank image.
 */
export function takeInventorySnapshot(renderer, scene, camera) {
  // Fixed isometric-ish angle for a consistent icon look
  const savedPos = camera.position.clone();
  const savedTarget = camera.userData._controlsTarget?.clone();

  camera.position.set(24, 24, 24);
  camera.lookAt(8, 8, 8);

  // Render transparent
  const savedClearColor = renderer.getClearColor(new (renderer.getClearColor.__proto__.constructor ?? Object)());
  const savedClearAlpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);

  // Crop/scale to 64×64 via offscreen canvas
  const src = renderer.domElement;
  const out = document.createElement('canvas');
  out.width = out.height = 64;
  const ctx = out.getContext('2d');

  // Centre-crop from the renderer canvas
  const srcSize = Math.min(src.width, src.height);
  const sx = (src.width  - srcSize) / 2;
  const sy = (src.height - srcSize) / 2;
  ctx.drawImage(src, sx, sy, srcSize, srcSize, 0, 0, 64, 64);

  const dataURL = out.toDataURL('image/png');

  // Restore renderer state
  renderer.setClearColor(0x111827, 1);
  camera.position.copy(savedPos);
  if (savedTarget) camera.lookAt(savedTarget);

  // Trigger download
  const link = document.createElement('a');
  link.download = 'hytale_icon.png';
  link.href = dataURL;
  link.click();

  return dataURL;
}
