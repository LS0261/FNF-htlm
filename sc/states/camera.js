// camera.js
export class Camera {
  constructor(x = 0, y = 0, width = 1280, height = 720, zIndex = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.zoom = 1;

    // Crear canvas y añadir al DOM
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.zIndex = zIndex;
    this.canvas.style.background = "transparent";

    this.ctx = this.canvas.getContext("2d");
  }

  begin() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  end() {
    this.ctx.restore();
  }

  follow(targetX, targetY) {
    this.x = targetX - this.width / 2 / this.zoom;
    this.y = targetY - this.height / 2 / this.zoom;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
