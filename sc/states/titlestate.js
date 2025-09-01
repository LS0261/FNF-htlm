import Paths from "../backend/Paths.js";
import { SpriteAnim } from "../backend/SpriteAnim.js";

export default class TitleState {
  constructor() {

    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');

    // Set size del canvas (ajusta según quieras)
    this.canvas.width = 1280;
    this.canvas.height = 720;
    
    this.bpm = 102;
    this.menuMusic = null;
    this.textElements = [];
    this.transitioning = false;
    this.newTitle = false;
    this.titleTimer = 0;
    this.idleTime = 0;
    this.sickBeats = 1;
    this.closedState = false;
    this.skippedIntro = false;

    this.msPerBeat = 60000 / this.bpm;
    this.anim = null;

    this.allowedKeys = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    this.easterEggKeysBuffer = '';
    this.easterEggKeys = ['SECRET', 'PSYCH'];

    this.init();
  }

  async init() {
    this.menuDiv = document.getElementById('menu');
    this.menuDiv.style.position = 'relative';
    this.menuDiv.innerHTML = '';

    this.playMenuMusic();
    this.bindInput();

    // Iniciar SpriteAnim
    this.anim = new SpriteAnim("gfDanceTitle");
    await this.anim.init({
      imageName: "gfDanceTitle",
      position: [0, 0],
      scale: 1
    });

    this.anim.addAnim("danceLeft", "gfDance0000", 24, false, [-15, -10]);
    this.anim.addAnim("danceRight", "gfDance instance 2", 24, false, [-15, -10]);
    this.anim.addAnim("idle", "gfDance idle", 24, true, [0, 0]);

    this.anim.play("danceLeft");

    // Simular beatHit()
    let intervalCount = 0;
    const interval = setInterval(() => {
      intervalCount++;
      this.beatHit();
      if (intervalCount > 20) clearInterval(interval);
    }, this.msPerBeat);

    // Loop de actualización
    const loop = (now) => {
      if (this.closedState) return;

      requestAnimationFrame(loop);
      this.update(1 / 60);
      this.draw();
    };
    requestAnimationFrame(loop);
  }

  update(delta) {
    if (this.transitioning) return;

    this.idleTime += delta;

    if (this.anim) {
      this.anim.update(delta);
    }

    if (this.newTitle) {
      this.titleTimer += delta;
      if (this.titleTimer > 2) this.titleTimer -= 2;
    }
  }

  draw() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.anim && this.anim.loaded) {
      this.anim.draw(ctx);
    }
  }

  beatHit() {
    if (this.closedState) return;

    this.sickBeats++;
    console.log("Beat:", this.sickBeats);

    switch (this.sickBeats) {
      case 1:
        this.menuMusic.volume = 0;
        this.menuMusic.play();
        break;

      case 2:
        this.createCoolText(['HTML Engine by'], 40);
        break;

      case 4:
        this.addMoreText('Lynx', 40);
        this.addMoreText('me', 40);
        break;

      case 5:
        this.deleteCoolText();
        break;

      case 6:
        this.createCoolText(['Not associated', 'with'], -40);
        break;

      case 8:
        this.addMoreText('newgrounds', -40);
        break;

      case 9:
        this.deleteCoolText();
        break;

      case 14:
        this.createCoolText(['Friday']);
        break;

      case 15:
        this.addMoreText('Night');
        break;

      case 16:
        this.addMoreText('Funkin');
        break;

      case 17:
        this.skipIntro();
        break;
    }

    // Alternar animación cada beat
    if (this.anim) {
      const animName = (this.sickBeats % 2 === 0) ? "danceLeft" : "danceRight";
      this.anim.play(animName);
    }
  }

  playMenuMusic() {
    const audioPath = Paths.music('freakyMenu');
    this.menuMusic = new Audio(audioPath);
    this.menuMusic.loop = true;
    this.menuMusic.volume = 0;

    this.menuMusic.play().then(() => {
      const fadeInDuration = 3000;
      const fadeStep = 50;
      const targetVolume = 0.6;
      const volumeIncrement = targetVolume / (fadeInDuration / fadeStep);

      const fadeInterval = setInterval(() => {
        if (this.menuMusic.volume + volumeIncrement >= targetVolume) {
          this.menuMusic.volume = targetVolume;
          clearInterval(fadeInterval);
        } else {
          this.menuMusic.volume += volumeIncrement;
        }
      }, fadeStep);
    }).catch(console.error);
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (this.transitioning) return;

      if (e.key === 'Enter') {
        this.onEnterPressed();
      } else if (e.key === 'Escape') {
        this.skipIntro();
      }
    });
  }

  onEnterPressed() {
    if (this.transitioning) return;

    console.log('Enter pressed - Start transition');
    this.transitioning = true;

    setTimeout(() => {
      console.log('Switch to MainMenuState (simulado)');
      this.closedState = true;
    }, 1000);
  }

  skipIntro() {
    if (this.transitioning || this.skippedIntro) return;

    console.log('Skipping intro...');
    this.skippedIntro = true;
    this.transitioning = true;
    this.deleteCoolText();

    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'white';
    flash.style.opacity = '1';
    flash.style.transition = 'opacity 1.5s ease-out';
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(flash);
        this.closedState = true;
      }, 1500);
    }, 0);

    this.menuMusic.play();
    this.menuMusic.volume = 0.6;
  }

  createCoolText(textArray, offsetY = 0) {
    textArray.forEach((text, i) => {
      const div = document.createElement('div');
      div.textContent = text;
      div.style.position = 'absolute';
      div.style.top = `${offsetY + i * 40}px`;
      div.style.left = '50%';
      div.style.transform = 'translateX(-50%)';
      div.style.fontSize = '40px';
      div.style.color = '#fff';
      div.style.textAlign = 'center';
      div.style.userSelect = 'none';
      div.style.whiteSpace = 'nowrap';

      this.menuDiv.appendChild(div);
      this.textElements.push(div);
    });
  }

  addMoreText(text, offsetY = 0) {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.position = 'absolute';
    div.style.top = `${offsetY + this.textElements.length * 60}px`;
    div.style.left = '50%';
    div.style.transform = 'translateX(-50%)';
    div.style.fontSize = '40px';
    div.style.color = '#fff';
    div.style.textAlign = 'center';
    div.style.userSelect = 'none';
    div.style.whiteSpace = 'nowrap';

    this.menuDiv.appendChild(div);
    this.textElements.push(div);
  }

  deleteCoolText() {
    this.textElements.forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.textElements = [];
  }
}
