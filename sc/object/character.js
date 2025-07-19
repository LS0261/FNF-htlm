export class Character {
  constructor(name) {
    this.name = name;
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
  }

  async init() {
    const res = await fetch(`data/characters/${this.name}.json`);
    this.data = await res.json();

    this.image.src = `images/${this.data.image}.png`;
    this.pos = this.data.position || [0, 0];
    this.scale = this.data.scale || 10;
    this.flipX = this.data.flip_x || false;

    const xmlText = await (await fetch(`images/${this.data.image}.xml`)).text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");

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
    }

    this.loaded = true;

    if (this.frames["idle"]) {
      this.play("idle");
    }
    this.healthIcon = this.data.healthicon || this.name;

  }

  play(anim) {
    if (this.animName !== anim) {
      this.animName = anim;
      this.animTimer = 0;
      this.frameIndex = 0;
    }
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

    this.animTimer += delta;
    if (this.animTimer >= 1 / def.fps) {
      this.animTimer = 0;
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

    const [ox, oy] = this.offsets[this.animName] || [0, 0];

    const drawX = this.pos[0] + ox;
    const drawY = this.pos[1] + oy;

    ctx.save();

    // Mover al centro del personaje
    ctx.translate(drawX, drawY);

    if (this.flipX) {
      ctx.scale(-1, 1); // voltear horizontalmente
    }

    ctx.drawImage(
      this.image,
      fx, fy, fw, fh,
      -fw * this.scale / 2, -fh * this.scale / 2,
      fw * this.scale, fh * this.scale
    );

    ctx.restore();
  }
}
