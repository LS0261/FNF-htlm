export class Character {
  constructor(name, isPlayer = false) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.flipX = !isPlayer;
    console.log(`[Character] Constructor llamado para: ${name}`); // TRACE 1
    this.image = new Image();
    this.frames = {};
    this.frameData = {};
    this.offsets = {};
    this.animName = "idle";
    this.animTimer = 0;
    this.frameIndex = 0;
    this.loaded = false;

    this.pos = [0, 0];
    this.scale = 1;
    this.flipX = false;

    this.singTimer = 0; // <-- timer para volver al idle
  }

  async init() {
    console.log(`[Character] Iniciando carga de datos para: ${this.name}`); // TRACE 2
    const res = await fetch(`data/characters/${this.name}.json`);
    this.data = await res.json();
    console.log(`[Character] JSON cargado para: ${this.name}`, this.data); // TRACE 3

    this.image.src = `images/${this.data.image}.png`;
    this.pos = this.data.position || [0, 0];
    this.scale = this.data.scale || 10;
    this.flipX = this.data.flip_x || false;

    const xmlText = await (await fetch(`images/${this.data.image}.xml`)).text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");
    console.log(`[Character] XML cargado para: ${this.name}`); // TRACE 4

    for (let anim of this.data.animations) {
      let name = anim.anim;
      let prefix = anim.name;
      let fps = anim.fps;
      let loop = anim.loop;
      let offsets = anim.offsets || [0, 0];

      let foundFrames = Array.from(xml.querySelectorAll("SubTexture"))
        .filter(n => n.getAttribute("name").startsWith(prefix));

      if (foundFrames.length === 0) {
        let single = xml.querySelector(`SubTexture[name="${prefix}"]`);
        if (single) foundFrames = [single];
      }

      this.frames[name] = foundFrames;
      this.frameData[name] = { fps, loop };
      this.offsets[name] = offsets;
      console.log(`[Character] Animación cargada: ${name} (${foundFrames.length} frames)`); // TRACE 5
    }

    this.loaded = true;
    console.log(`[Character] ${this.name} cargado completamente.`); // TRACE 6

    if (this.frames["idle"]) {
      this.play("idle");
    }
    this.healthIcon = this.data.healthicon || this.name;

  }

  //play(anim) {
    //if (this.animName !== anim) {
      //this.animName = anim;
      //this.animTimer = 0;
      //this.frameIndex = 0;
    //}
  //}
play(anim) {
  this.animName = anim;
  this.animTimer = 0;
  this.frameIndex = 0;
  console.log(`[TRACE] play('${anim}') llamado. frameIndex=0, animTimer=0`);
}
  dance() {
    if (this.frames["idle"]) {
      this.play("idle");
    }
  }

update(delta) {
  if (!this.loaded) return;
  const def = this.frameData[this.animName];
  if (!def || def.fps <= 0) return;

  // TRACE: Mostrar FPS actual
  // console.log(`[TRACE] update: anim='${this.animName}', fps=${def.fps}, frameIndex=${this.frameIndex}`);

  this.animTimer += delta;
  const frameTime = 1 / def.fps;
  while (this.animTimer >= frameTime) {
    this.animTimer -= frameTime;
    this.frameIndex++;
    if (this.frameIndex >= this.frames[this.animName].length) {
      this.frameIndex = def.loop ? 0 : this.frames[this.animName].length - 1;
    }
  }

  // --- Volver al idle después de cantar ---
  if (["singLEFT", "singDOWN", "singUP", "singRIGHT"].includes(this.animName)) {
    if (this.singTimer > 0) {
      this.singTimer -= delta;
      if (this.singTimer <= 0) {
        this.play("idle");
        this.singTimer = 0;
      }
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

  // Recorte y offsets
  const frameX = parseInt(frame.getAttribute("frameX") || 0);
  const frameY = parseInt(frame.getAttribute("frameY") || 0);
  const frameW = parseInt(frame.getAttribute("frameWidth") || fw);
  const frameH = parseInt(frame.getAttribute("frameHeight") || fh);

  // Usa solo position y offsets del JSON
  const [ox, oy] = this.offsets[this.animName] || [0, 0];

  // Posición real: base + offset de animación - offset del frame
  const drawX = this.pos[0] + ox - frameX * this.scale;
  const drawY = this.pos[1] + oy - frameY * this.scale;

  ctx.save();
  ctx.translate(drawX, drawY);

  if (this.flipX) {
    ctx.scale(1, 1);
  }

  ctx.drawImage(
    this.image,
    fx, fy, fw, fh,
    0, 0,
    frameW * this.scale, frameH * this.scale
  );

  ctx.restore();
}
}
