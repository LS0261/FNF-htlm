import Paths from "./Paths.js";

export class SpriteAnim {
  constructor(name) {
    this.name = name;

    this.image = new Image();
    this.xml = null;

    this.frames = {};
    this.frameData = {};
    this.offsets = {};

    this.animName = "idle";
    this.animTimer = 0;
    this.frameIndex = 0;
    this.flipX = false;

    this.loaded = false;
    this.scale = 1;
    this.pos = [0, 0];
    this.alpha = 1;
    this.rotation = 0;
  }

async init({ imageName = null, position = [0, 0], scale = 1, flipX = false }) {
  this.pos = position;
  this.scale = scale;
  this.flipX = flipX;

  const base = imageName || this.name;

  const imagePath = Paths.image(base);
  console.log(`Intentando cargar imagen desde: ${imagePath}`);
  this.image.src = imagePath;

  const atlasPath = Paths.textureAtlas(base);
  console.log(`Intentando cargar atlas XML desde: ${atlasPath}`);

  try {
    const response = await fetch(atlasPath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const xmlText = await response.text();
    const parser = new DOMParser();
    this.xml = parser.parseFromString(xmlText, "application/xml");
    this.loaded = true;
    console.log("Atlas XML cargado correctamente.");
  } catch (error) {
    console.error(`Error cargando atlas XML desde ${atlasPath}:`, error);
    this.loaded = false;
  }
}

  addAnim(animName, prefix, fps = 24, loop = true, offsets = [0, 0]) {
    if (!this.xml) {
      console.warn("XML no está cargado. Llama init() primero.");
      return;
    }

    let foundFrames = Array.from(this.xml.querySelectorAll("SubTexture"))
      .filter(node => node.getAttribute("name").startsWith(prefix));

    if (foundFrames.length === 0) {
      const single = this.xml.querySelector(`SubTexture[name="${prefix}"]`);
      if (single) foundFrames = [single];
    }

    this.frames[animName] = foundFrames;
    this.frameData[animName] = { fps, loop };
    this.offsets[animName] = offsets;

    // Opción: si aún no hay animación activa, establecerla
    if (!this.animName && foundFrames.length > 0) {
      this.play(animName);
    }
  }

  play(anim) {
    if (this.animName !== anim) {
      this.animName = anim;
      this.animTimer = 0;
      this.frameIndex = 0;
    }
  }

  update(delta) {
    if (!this.loaded) return;

    const def = this.frameData[this.animName];
    if (!def || def.fps <= 0) return;

    this.animTimer += delta;
    const frameTime = 1 / def.fps;

    while (this.animTimer >= frameTime) {
      this.animTimer -= frameTime;
      this.frameIndex++;
      if (this.frameIndex >= this.frames[this.animName].length) {
        this.frameIndex = def.loop ? 0 : this.frames[this.animName].length - 1;
      }
    }
  }

  draw(ctx) {
    if (!this.loaded) return;

    const frames = this.frames[this.animName];
    if (!frames || frames.length === 0) return;

    const frame = frames[this.frameIndex];

    const fx = parseInt(frame.getAttribute("x"));
    const fy = parseInt(frame.getAttribute("y"));
    const fw = parseInt(frame.getAttribute("width"));
    const fh = parseInt(frame.getAttribute("height"));

    const frameX = parseInt(frame.getAttribute("frameX") || 0);
    const frameY = parseInt(frame.getAttribute("frameY") || 0);
    const frameW = parseInt(frame.getAttribute("frameWidth") || fw);
    const frameH = parseInt(frame.getAttribute("frameHeight") || fh);

    const [ox, oy] = this.offsets[this.animName] || [0, 0];

    const drawX = this.pos[0] + ox - frameX * this.scale;
    const drawY = this.pos[1] + oy - frameY * this.scale;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(drawX, drawY);
    if (this.flipX) ctx.scale(-1, 1);
    if (this.rotation !== 0) ctx.rotate(this.rotation);

    ctx.drawImage(
      this.image,
      fx, fy, fw, fh,
      0, 0,
      frameW * this.scale,
      frameH * this.scale
    );

    ctx.restore();
  }
}
