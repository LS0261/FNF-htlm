// Bar.js
import Paths from '../backend/paths.js';

class Bar {
  constructor(x, y, imageName = 'healthBar', valueFunction = null, boundMin = 0, boundMax = 1) {
    this.x = x;
    this.y = y;

    this.valueFunction = valueFunction;
    this.bounds = { min: boundMin, max: boundMax };

    this.percent = 0;
    this.leftToRight = true;
    this.barCenter = 0;

    // Carga la imagen usando Paths.image()
    this.bgImage = new Image();
    this.bgImage.src = Paths.image(imageName);  // ✅ Usa nombre simple como 'healthBar'

    this.barWidth = 0;
    this.barHeight = 0;
    this.barOffset = { x: 3, y: 3 };

    this.leftBarColor = '#FFFFFF';  // Blanco
    this.rightBarColor = '#000000'; // Negro

    this.enabled = true;

    // Canvas interno para la barra
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    // Cuando cargue la imagen, configura tamaño y dibuja
    this.bgImage.onload = () => {
      this.barWidth = this.bgImage.width - 6;
      this.barHeight = this.bgImage.height - 6;
      this.canvas.width = this.bgImage.width;
      this.canvas.height = this.bgImage.height;
      this.updateBar();
    };
  }

  update(elapsed) {
    if (!this.enabled) return;

    if (this.valueFunction) {
      let value = this.valueFunction();
      value = this.remap(value, this.bounds.min, this.bounds.max, 0, 100);
      this.percent = Math.min(Math.max(value, 0), 100);
    } else {
      this.percent = 0;
    }

    this.updateBar();
  }

  setBounds(min, max) {
    this.bounds.min = min;
    this.bounds.max = max;
  }

  setColors(left, right) {
    if (left) this.leftBarColor = left;
    if (right) this.rightBarColor = right;
  }

updateBar() {
  if (!this.bgImage.complete) return;

  const ctx = this.ctx;
  ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  // Dibuja fondo
  ctx.drawImage(this.bgImage, 0, 0);

  // Calcula el tamaño de las secciones
  let rightSize = this.lerp(0, this.barWidth, this.percent / 100); // verde
  let leftSize = this.barWidth - rightSize; // rojo

  // Dibuja parte izquierda (enemigo)
  ctx.fillStyle = this.leftBarColor; // rojo
  ctx.fillRect(this.barOffset.x, this.barOffset.y, leftSize, this.barHeight);

  // Dibuja parte derecha (jugador)
  ctx.fillStyle = this.rightBarColor; // verde
  ctx.fillRect(this.barOffset.x + leftSize, this.barOffset.y, rightSize, this.barHeight);

  // Actualiza centro de barra
  this.barCenter = this.x + this.barOffset.x + leftSize;
}

  lerp(start, end, t) {
    return start + (end - start) * t;
  }

  remap(value, fromMin, fromMax, toMin, toMax) {
    return ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
  }

  drawTo(ctx) {
    if (this.canvas.width > 0 && this.canvas.height > 0) {
      ctx.drawImage(this.canvas, this.x, this.y);
    }
  }
}

export default Bar;
