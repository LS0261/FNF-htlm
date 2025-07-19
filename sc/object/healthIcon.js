import Paths from '../backend/paths.js';

class HealthIcon {
  constructor(char = 'face', isPlayer = false) {
    this.char = '';
    this.iconOffsets = [0, 0];
    this.isPlayer = isPlayer;
    this.sprite = new Image();
    this.x = 0;
    this.y = 0;
    this.sprTracker = null;
    this.autoAdjustOffset = true;

    this.changeIcon(char);
  }

  update() {
    if (this.sprTracker) {
      this.x = this.sprTracker.x + this.sprTracker.width + 12;
      this.y = this.sprTracker.y - 30;
    }
  }

async changeIcon(char) {
  if (this.char === char) return;

  const tryPaths = [
    `icons/icon-${char}`,
    `icons/icon-face`
  ];

  let finalPath = '';
  for (let path of tryPaths) {
    const url = Paths.image(path);
    //console.log('Probing icon path:', url); // 👈 VERIFICAR RUTA
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        finalPath = url;
        break;
      }
    } catch (e) {
      //console.warn('Fetch HEAD error for', url, e);
    }
  }

  if (!finalPath) {
    //console.error('❌ No se encontró icono para:', char);
    return;
  }

  this.sprite.src = finalPath;
  this.char = char;

  this.sprite.onload = () => {
    //console.log(`✅ Icono cargado: ${char} (${this.sprite.width}x${this.sprite.height})`);
    const iSize = Math.round(this.sprite.width / this.sprite.height);
    this.iconOffsets[0] = (this.sprite.width - 150) / iSize;
    this.iconOffsets[1] = (this.sprite.height - 150) / iSize;
  };
}

draw(ctx, health, isPlayer = false) {
  if (!this.visible || this.alpha <= 0 || !this.sprite.complete) return;

  let frame = 0;

  if (!isNaN(health)) {
    if (isPlayer && health < 0.2) frame = 1;
    if (!isPlayer && health > 0.8) frame = 1;
  }

  const frameWidth = this.sprite.width / 2;

  ctx.save();
  ctx.globalAlpha = this.alpha ?? 1;
  ctx.drawImage(
    this.sprite,
    frame * frameWidth, 0, frameWidth, this.sprite.height, // source rect
    this.x - this.iconOffsets[0], this.y - this.iconOffsets[1], frameWidth, this.sprite.height // destination
  );
  ctx.restore();

  // DEBUG opcional:
  //console.log(`🖼️ Dibujando icono (${this.char}) en (${this.x}, ${this.y}) con alpha=${this.alpha}`);
}

  getCharacter() {
    return this.char;
  }
}

export default HealthIcon;