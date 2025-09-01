import { Character } from "../object/character.js";
import Paths from "../backend/paths.js";
import Bar from "../object/bar.js";
import HealthIcon from "../object/healthIcon.js";
import ClientPrefs from "../backend/clientPrefs.js";
import { registerStageLuaFunctions } from "../luabridge/stageBridge.js";
import { Camera } from "./camera.js";
import AssetsLoader from "../backend/assetsLoader.js";


const loader = new AssetsLoader();

// ==== LUA (Fengari) ====
const lua = fengari.lua;
const lauxlib = fengari.lauxlib;
const lualib = fengari.lualib;
const to_luastring = fengari.to_luastring;

// ==== UI base ====
const menuDiv = document.getElementById("menu");

// =====================================================
//  PlayState (versión saneada: corrige 'const' reasignados
//  y referencias a ctxGame/ctxHUD no definidas)
// =====================================================
export default class PlayState {
  constructor() {
    // Estado general y preferencias
    this.clientPrefs = new ClientPrefs();
    this.clientPrefs.loadPrefs();
    console.log(this.clientPrefs.data);

    // Tamaño fijo (no se escalan canvases al redimensionar)
    this.FIXED_W = 1280;
    this.FIXED_H = 720;

    this.container = document.getElementById("gameContainer");

    // Cámaras (cada una crea su propio canvas + ctx)
    this.camGame = new Camera(0, 0, this.FIXED_W, this.FIXED_H, 1);
    this.camHUD = new Camera(0, 0, this.FIXED_W, this.FIXED_H, 2);

    this.container.appendChild(this.camGame.canvas); // abajo
    this.container.appendChild(this.camHUD.canvas);  // encima

    // Alias útiles
    this.gameCanvas = this.camGame.canvas;
    this.hudCanvas = this.camHUD.canvas;
    this.ctxGame = this.camGame.ctx;
    this.ctxHUD = this.camHUD.ctx;


    // Objeto que la cámara seguirá (no es el Character todavía)
    this.camTarget = { pos: [this.FIXED_W / 2, this.FIXED_H / 2] };

    // Lua VM
    this.L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(this.L);
    registerStageLuaFunctions(this.L);

    // Escucha de resize (no escala, solo re-pos HUD si hace falta)
    window.addEventListener("resize", () => this.repositionHUD?.());

    // Cargar modchart.lua (si existe)
    fetch("data/songs/bopeebo-rumble/modchart.lua")
      .then((res) => res.text())
      .then((modchart) => {
        const result = lauxlib.luaL_dostring(this.L, to_luastring(modchart));
        if (result !== lua.LUA_OK) {
          const err = fengari.to_jsstring(lua.lua_tostring(this.L, -1));
          console.error("Lua error:", err);
        } else {
          console.log("✅ Lua ejecutado correctamente desde archivo.");
        }
      })
      .catch(() => {});

    // Estado de sprites LUA expuestos en window
    this.luaSprites = {};
    window.luaSprites = this.luaSprites;

    // ===== Variables de juego =====
    this.W = this.FIXED_W;
    this.H = this.FIXED_H;

    this.fixedSpeed = 1.0;
    this.bpmSections = [];

    this.bfNotes = [];
    this.dadNotes = [];
    this.uiGroup = [];

    this.notesPassed = 0;
    this.totalNotes = 0;
    this.scrollDuration = 3000;
    this.anticipationMs = 0;
    this.lastTimestamp = 0;
    this.audioInst = null;
    this.playing = false;

    this.playerHealth = 50;
    this.targetHealth = 1;
    this.playerMaxHealth = 100;

    this.iconP1 = null;
    this.iconP2 = null;

    // Personajes
    this.boyfriend = null;
    this.gf = null;
    this.dad = null;

    // INPUT / lanes
    this.hitWindow = 250; // ms

    this.healthBar = new Bar(0, 0, "healthBar", () => this.playerHealth, 0, this.playerMaxHealth);
    this.healthBar.setColors("#f00", "#0f0");

    this.keyToLane = {
      ArrowLeft: 0,
      KeyA: 0,
      ArrowDown: 1,
      KeyS: 1,
      ArrowUp: 2,
      KeyK: 2,
      ArrowRight: 3,
      KeyL: 3,
    };

    // ⚠️ Era const y luego lo reasignaban -> debe ser let
    this.lanesHeld = [
      { held: false, holdNote: null },
      { held: false, holdNote: null },
      { held: false, holdNote: null },
      { held: false, holdNote: null },
    ];

    this.hitSound = new Audio(Paths.hitsound);
    this.hitSound.volume = 0.5;

    this.ratingSprites = [];

    this.laneStates = [
      { state: "idle", timer: 0, frameIdx: 0 },
      { state: "idle", timer: 0, frameIdx: 0 },
      { state: "idle", timer: 0, frameIdx: 0 },
      { state: "idle", timer: 0, frameIdx: 0 },
    ];

    this.laneDirs = ["left", "down", "up", "right"];
    this.score = 0;
    this.ratingsCount = { sick: 0, good: 0, bad: 0, shit: 0 };
    this.misses = 0;

    this.dadReceptorY = 100;
    this.bfReceptorY = this.dadReceptorY;
    this.baseDistance = Math.abs(this.bfReceptorY - 50);

    // HUD zoom + metrónomo
    this.hudZoom = 1;
    this.hudZoomTarget = 1;
    this.beatLength = 60000 / 120;
    this.lastBeatTime = 0;
    this.beatCount = 0;

    this.metronome1 = new Audio(Paths.metronome1);
    this.metronome2 = new Audio(Paths.metronome2);

    // Botones de UI
    this.setupButtons();

    this.camGame.canvas.style.zIndex = "1";
    this.camHUD.canvas.style.zIndex = "2";
    this.playBtn.style.zIndex = "1000";
    this.pauseBtn.style.zIndex = "1000";

    // Eventos de input
    this.bindInputs();

    // Menú de semanas y bucle
    this.loadMenu();
    this.lastTimestamp = performance.now();
    requestAnimationFrame((t) => this.loop(t));

    // Render básico (cam + sprites lua)
    //requestAnimationFrame(() => this.render());
    document.getElementById("canvas").style.display = "block";
  }

  // ---------------------------------
  // UI Buttons
  // ---------------------------------
  setupButtons() {
    // ▶ PLAY
    this.playBtn = document.createElement("button");
    this.playBtn.textContent = "▶ PLAY";
    Object.assign(this.playBtn.style, {
      position: "fixed",
      bottom: "50%",
      left: "50%",
      transform: "translate(-50%, 0)",
      fontSize: "30px",
      padding: "10px 30px",
      display: "none",
      zIndex: "1000",
    });
    document.body.appendChild(this.playBtn);
    this.playBtn.onclick = () => {
      if (this.audioInst) this.audioInst.play();
      this.playing = true;
      this.playBtn.style.display = "none";
      this.pauseBtn.style.display = "block";
    };

    // ⏸ PAUSE
    this.pauseBtn = document.createElement("img");
    this.pauseBtn.src = "images/pause.png";
    Object.assign(this.pauseBtn.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      width: "99px",
      height: "93px",
      cursor: "pointer",
      zIndex: "1000",
      display: "none",
    });
    document.body.appendChild(this.pauseBtn);
    this.pauseBtn.onclick = () => {
      this.playing = false;
      // openPauseMenu debe existir en tu proyecto
      openPauseMenu(this.audioInst, () => {
        this.playing = true;
        this.pauseBtn.style.display = "block";
      });
      this.pauseBtn.style.display = "none";
    };
  }

  // ---------------------------------
  // Menú de weeks
  // ---------------------------------
  loadMenu() {
    fetch("data/weeks/weekList.json")
      .then((res) => res.json())
      .then((json) => {
        menuDiv.innerHTML = "<h2>Selecciona una week:</h2>";
        json.weeks.forEach((week) => {
          week.songs.forEach((songEntry) => {
            const songName = songEntry[0];
            const btn = document.createElement("button");
            btn.textContent = `${week.weekName} - ${songName}`;
            btn.onclick = () => this.startSong(songName.toLowerCase());
            menuDiv.appendChild(btn);
          });
        });
      })
      .catch((err) => {
        console.error("Error cargando weekList.json:", err);
        menuDiv.innerHTML = "<p>Error cargando weeks.</p>";
      });
  }

  startSong(songName) {
    menuDiv.style.display = "none";
    this.pauseBtn.style.display = "block";
    this.startPlay(songName);
  }

  // ---------------------------------
  // Core: cargar canción + stage + personajes
  // ---------------------------------
  async startPlay(songName) {
    // JSON de la canción (para stage/bpm/notas)
    const res = await fetch(Paths.songJSON(songName));
    const json = await res.json();

    // Stage name por JSON o default
    let stageName = json.song.stage || "stage";

    // Reset de estado importante
    this.bfNotes = [];
    this.dadNotes = [];
    this.notesPassed = 0;
    this.totalNotes = 0;
    this.playing = false;
    this.ratingSprites = [];
    this.laneStates = this.laneStates.map(() => ({ state: "idle", timer: 0, frameIdx: 0 }));
    this.score = 0;
    this.ratingsCount = { sick: 0, good: 0, bad: 0, shit: 0 };
    this.misses = 0;

    // Audio instrumental
    this.audioInst = new Audio(Paths.songInst(songName));
    this.audioInst.volume = 0.5;

    // Cargar stage y posiciones
    let bfPos, gfPos, dadPos;
    let camBF, camGF, camDad;
    let cameraSpeed = 1;
    let hideGF = false;

    try {
      const stageData = await loadJSON(Paths.stageJSON(stageName));
      const positions = loadStagePositions(stageData);

      // Ejecutar stage.lua si existe
      try {
        const luaText = await fetch(`scripts/stages/${stageName}.lua`).then((r) => r.text());
        const result = lauxlib.luaL_dostring(this.L, to_luastring(luaText));
        if (result !== lua.LUA_OK) {
          const err = fengari.to_jsstring(lua.lua_tostring(this.L, -1));
          console.error(`Error al ejecutar stage.lua: ${err}`);
        } else {
          console.log(`✅ stage.lua cargado y ejecutado correctamente para ${stageName}`);
        }
      } catch (e) {
        console.warn(`⚠ No se encontró stage.lua para ${stageName}`);
      }

      bfPos = positions.bfPos;
      gfPos = positions.gfPos;
      dadPos = positions.dadPos;

      camBF = positions.camBF;
      camGF = positions.camGF;
      camDad = positions.camDad;
      cameraSpeed = positions.cameraSpeed;
      hideGF = positions.hideGF;
    } catch (e) {
      console.warn(`⚠ No se pudo cargar el stage "${stageName}". Usando posiciones por defecto.`);
      bfPos = [300, 100];
      gfPos = [400, 130];
      dadPos = [100, 100];
      camBF = camGF = camDad = [0, 0];
      cameraSpeed = 1;
      hideGF = false;
    }

    // Personajes (⚠️ Antes reasignaban un const llamado 'boyfriend')
    try {
      this.boyfriend = new Character("bf", true);
      await this.boyfriend.init();
      this.boyfriend.pos = bfPos;
    } catch (e) {
      console.warn("No se pudo cargar el personaje, usando BF por defecto.");
      this.boyfriend = new Character("bf", true);
      await this.boyfriend.init();
      this.boyfriend.pos = bfPos;
    }

    try {
      this.dad = new Character("dad", false);
      await this.dad.init();
      this.dad.pos = dadPos;
    } catch (e) {
      console.warn("No se pudo cargar el personaje Dad, usando BF por defecto.");
      this.dad = new Character("bf", false);
      await this.dad.init();
      this.dad.pos = dadPos;
    }

    if (!hideGF) {
      try {
        this.gf = new Character("gf", false);
        await this.gf.init();
        this.gf.pos = [bfPos[0] - 150, bfPos[1] - 120];
      } catch (e) {
        console.warn("No se pudo cargar GF, usando BF por defecto.");
        this.gf = new Character("bf", false);
        await this.gf.init();
        this.gf.pos = [bfPos[0] - 150, bfPos[1] - 120];
      }
    }

    // Iconos de vida (coordenadas se actualizarán en draw por healthBar)
    this.iconP1 = await new HealthIcon(this.boyfriend.healthIcon, true);
    this.iconP1.visible = !(this.clientPrefs?.data?.hideHud ?? false);
    this.iconP1.alpha = this.clientPrefs.data.healthBarAlpha;
    this.uiGroup.push(this.iconP1);

    this.iconP2 = await new HealthIcon(this.dad.healthIcon, false);
    this.iconP2.visible = !(this.clientPrefs?.data?.hideHud ?? false);
    this.iconP2.alpha = this.clientPrefs.data.healthBarAlpha;
    this.uiGroup.push(this.iconP2);

    // Al terminar la canción
    this.audioInst.onended = async () => {
      this.playing = false;
      this.pauseBtn.style.display = "none";
      menuDiv.style.display = "block";
      this.playBtn.style.display = "none";

      this.bfNotes = [];
      this.dadNotes = [];
      this.notesPassed = 0;
      this.totalNotes = 0;
    };

    // Velocidad / scroll
    const speedMultiplier = json.song.speed || 1;
    this.fixedSpeed = speedMultiplier * 0.25;
    this.scrollDuration = 2000 / speedMultiplier;
    this.baseDistance = Math.abs(this.bfReceptorY - 30);

    // BPM base
    let bpm = json.song.bpm || 120;
    this.beatLength = (60000 / bpm) * 2;

    // Notas
    json.song.notes.forEach((section) => {
      section.sectionNotes.forEach((note) => {
        let time = note[0] + this.anticipationMs;
        let lane = note[1];
        let sustain = note[2];

        if (section.mustHitSection) {
          if (lane < 4) lane += 4;
          else lane -= 4;
        }

        const noteObj = { time, lane, sustain, hit: false };
        if (lane < 4) this.dadNotes.push(noteObj);
        else this.bfNotes.push(noteObj);
      });
    });
    this.totalNotes = this.bfNotes.length;

    // BPM dinámico
    this.bpmSections = [];
    json.song.notes.forEach((section) => {
      if (section.changeBPM) {
        const firstNoteTime = section.sectionNotes.length > 0 ? section.sectionNotes[0][0] : 0;
        this.bpmSections.push({ time: firstNoteTime + this.anticipationMs, bpm: section.bpm });
      }
    });
    if (this.bpmSections.length === 0) this.bpmSections.push({ time: 0, bpm });

    this.lastBeatTime = 0;
    this.beatCount = 0;

    // HUD pos inicial
    this.lastTimestamp = performance.now();
    this.repositionHUD();

    // Mostrar botón de play
    this.playBtn.style.display = "block";

this.stage = {
  draw: (ctx) => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.W, this.H);
  }
};

  }

  // ---------------------------------
  // HUD layout
  // ---------------------------------
  repositionHUD() {
    const barWidth = this.W * 0.6;
    const barHeight = 20;

    this.healthBar.barWidth = barWidth;
    this.healthBar.barHeight = barHeight;
    this.healthBar.x = (this.W - barWidth) / 2;
    this.healthBar.y = this.H - 50; // abajo
  }

  // ---------------------------------
  // Input bindings
  // ---------------------------------
  bindInputs() {
    // Mouse / touch sobre el canvas del juego
    this.gameCanvas.addEventListener("mousedown", (e) => this.handleMouseTouch(e.clientX));
    this.gameCanvas.addEventListener("mousemove", (e) => {
      if (e.buttons) this.handleMouseTouch(e.clientX);
    });
    this.gameCanvas.addEventListener("mouseup", () => {
      this.lanesHeld = this.lanesHeld.map(() => ({ held: false, holdNote: null }));
    });

    this.gameCanvas.addEventListener(
      "touchstart",
      (e) => {
        this.handleTouches(e.touches);
        e.preventDefault();
      },
      { passive: false }
    );

    this.gameCanvas.addEventListener(
      "touchmove",
      (e) => {
        this.handleTouches(e.touches);
        e.preventDefault();
      },
      { passive: false }
    );

    this.gameCanvas.addEventListener("touchend", () => {
      for (let i = 0; i < 4; i++) {
        if (this.lanesHeld[i].held && this.lanesHeld[i].holdNote) {
          const note = this.lanesHeld[i].holdNote;
          const songPos = this.getSongPos();
          if (songPos >= note.time && songPos <= note.time + note.sustain + 150) {
            this.score += 50;
            this.notesPassed++;
          } else {
            this.misses++;
            this.targetHealth = Math.max(0, this.targetHealth - 0.5);
          }
          const idx = this.bfNotes.indexOf(note);
          if (idx !== -1) this.bfNotes.splice(idx, 1);
        }
        this.lanesHeld[i].held = false;
        this.lanesHeld[i].holdNote = null;
      }
    });

    // Teclado
    document.addEventListener("keydown", (e) => {
      const lane = this.keyToLane[e.code];
      if (lane !== undefined) {
        if (!this.lanesHeld[lane].held) {
          this.lanesHeld[lane].held = true;
          this.tryHitLane(lane);
        }
      }

      // Forzar idle en BF (debug)
      if (e.code === "KeyX") {
        if (this.boyfriend) {
          this.boyfriend.play("idle");
        }
      }
    });

    document.addEventListener("keyup", (e) => {
      const lane = this.keyToLane[e.code];
      if (lane !== undefined) {
        if (this.lanesHeld[lane].held) {
          this.lanesHeld[lane].held = false;

          // Si había holdNote y se soltó antes de tiempo -> fallo
          const heldNote = this.lanesHeld[lane].holdNote;
          if (heldNote) {
            const songPos = this.getSongPos();
            const idx = this.bfNotes.indexOf(heldNote);
            if (idx !== -1) this.bfNotes.splice(idx, 1);

            if (songPos >= heldNote.time && songPos <= heldNote.time + heldNote.sustain + 150) {
              this.score += 50;
              this.notesPassed++;
              this.addRatingSprite(30);
            } else {
              this.misses++;
              this.targetHealth = Math.max(0, this.targetHealth - 0.5);
            }
            this.lanesHeld[lane].holdNote = null;
          }
        }
      }
    });
  }

  // ---------------------------------
  // Helpers
  // ---------------------------------
  getSongPos() {
    return this.audioInst ? this.audioInst.currentTime * 1000 : 0;
  }

  addRatingSprite(diff) {
    let type;
    if (diff <= 60) type = "sick";
    else if (diff <= 120) type = "good";
    else if (diff <= 180) type = "bad";
    else if (diff <= this.hitWindow) type = "shit";
    else type = "miss";

    this.ratingsCount[type] = (this.ratingsCount[type] || 0) + 1;

    if (type === "sick") this.score += 350;
    else if (type === "good") this.score += 200;
    else if (type === "bad") this.score += 100;
    else if (type === "shit") this.score += 50;

    // Requiere que NotesAssets exista globalmente
    if (type !== "miss" && window.NotesAssets?.ratingsImages?.[type]) {
      this.ratingSprites.push({
        img: window.NotesAssets.ratingsImages[type],
        x: this.W / 2 - 50,
        y: this.H / 3,
        vy: -1.2,
        gravity: 0.05,
        alpha: 1,
        timer: 0,
      });
    }
  }

  getProgress() {
    if (!this.audioInst || !this.audioInst.duration) return 0;
    return this.audioInst.currentTime / this.audioInst.duration;
  }

  drawProgressBar(ctx) {
    const progress = this.getProgress();
    const barWidth = this.W * 0.8;
    const barHeight = 20;
    const x = this.W * 0.1;
    const y = 20;

    ctx.fillStyle = "#444";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#0f0";
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

  calculateNoteY(note, songPos, receptorY, upwards) {
    const speed = this.fixedSpeed;
    const timeDiff = note.time - songPos;
    return upwards ? receptorY + timeDiff * speed : receptorY - timeDiff * speed;
  }

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  updateHealthIcons() {
    const healthPercent = this.clamp(this.playerHealth / this.playerMaxHealth, 0, 1);
    const barX = this.healthBar.x + this.healthBar.barOffset.x;
    const barY = this.healthBar.y + this.healthBar.barOffset.y;
    const barW = this.healthBar.barWidth;
    const iconW = this.iconP1.width || 75;
    const iconH = this.iconP1.height || 75;
    const iconY = barY - 40;

    const clampX = (x) => Math.max(barX, Math.min(x, barX + barW - iconW));

    const p1X = clampX(barX + (1 - healthPercent) * barW);
    const p2X = clampX(barX + healthPercent * barW);

    this.iconP1.x = p1X;
    this.iconP2.x = p2X;
    this.iconP1.y = iconY;
    this.iconP2.y = iconY;
  }
drawStrumline(ctx) {
  const receptorY = this.H - 150; // altura de los receptores
  const receptorX = this.W / 2 - 200; // centro aproximado

  for (let i = 0; i < 4; i++) {
    const x = receptorX + i * 100;
    const y = receptorY;

    // Rectángulo temporal (receptor) - luego reemplazas con sprites
    ctx.fillStyle = "white";
    ctx.fillRect(x - 25, y - 25, 50, 50);

    // Dibujar estado (ejemplo debug)
    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(this.laneDirs[i], x - 20, y + 40);
  }
}
  // ---------------------------------
  // Bucle principal
  // ---------------------------------
  loop(timestamp) {
    this.ctxHUD.fillStyle = "rgba(255,0,0,0.3)";
this.ctxHUD.fillRect(0,0,this.W,this.H);

    this.ctxGame.fillStyle = "blue";
this.ctxGame.fillRect(0,0,this.W,this.H);

this.ctxHUD.fillStyle = "white";
this.ctxHUD.font = "30px Arial";
this.ctxHUD.fillText("HUD OK", 100, 100);

    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    requestAnimationFrame((t) => this.loop(t));
    if (this.stage?.draw) this.stage.draw(this.ctxGame);

    if (this.playing) {
      // update + draw personajes
    }
    
    //if (!this.playing) return;

    const ctxGame = this.ctxGame;
    const ctxHUD = this.ctxHUD;

// --- GAME LAYER ---
this.camGame.clear();
this.camGame.follow(this.camTarget.pos[0], this.camTarget.pos[1]);
this.camGame.begin();

// Stage
if (this.stage?.draw) this.stage.draw(this.camGame.ctx);

// Personajes
if (this.gf) this.gf.draw(this.camGame.ctx);
if (this.dad) this.dad.draw(this.camGame.ctx);
if (this.boyfriend) this.boyfriend.draw(this.camGame.ctx);

this.camGame.end();

// --- HUD LAYER ---
ctxHUD.setTransform(1, 0, 0, 1, 0, 0);
ctxHUD.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);

ctxHUD.fillStyle = "white";
ctxHUD.font = "24px Arial";
ctxHUD.fillText("HUD LAYER", 20, 40);

// Ahora aplica el zoom HUD, pero SIN volver a limpiar
ctxHUD.setTransform(1, 0, 0, 1, 0, 0);
ctxHUD.translate(this.W / 2, this.H / 2);
ctxHUD.scale(this.hudZoom, this.hudZoom);
ctxHUD.translate(-this.W / 2, -this.H / 2);

    // === Actualizar personajes ===
if (this.boyfriend) this.boyfriend.update(delta);
if (this.dad) this.dad.update(delta);
if (this.gf) this.gf.update(delta);

    const songPos = this.getSongPos();

    // === BPM dinámico ===
    let currentBpm = this.bpmSections[0]?.bpm ?? 120;
    let currentBeatLength = 60000 / currentBpm;
    for (let i = 0; i < this.bpmSections.length; i++) {
      if (songPos >= this.bpmSections[i].time) {
        currentBpm = this.bpmSections[i].bpm;
        currentBeatLength = 60000 / currentBpm;
      } else break;
    }

    // === Beat logic (zoom, metronome) ===
    if (songPos - this.lastBeatTime >= currentBeatLength - 5) {
      this.beatCount = (this.beatCount + 1) % 4;
      this.hudZoom = this.beatCount === 0 ? 1.1 : this.beatCount === 2 ? 1.05 : 1.0;
      if (this.beatCount === 0) this.metronome1.currentTime = 0;
      if (this.beatCount === 2) this.metronome2.currentTime = 0;

      this.hudZoomTarget = 1;
      this.lastBeatTime += currentBeatLength;
      if (songPos - this.lastBeatTime > currentBeatLength) this.lastBeatTime = songPos;
    }

    // Suavizado de vida
    const smoothSpeed = 3;
    this.playerHealth += (this.targetHealth - this.playerHealth) * smoothSpeed * delta;
    if (Math.abs(this.targetHealth - this.playerHealth) < 0.001) this.playerHealth = this.targetHealth;

    // Zoom del HUD
    this.hudZoom += (this.hudZoomTarget - this.hudZoom) * 0.07;
    ctxHUD.setTransform(1, 0, 0, 1, 0, 0);
    ctxHUD.translate(this.W / 2, this.H / 2);
    ctxHUD.scale(this.hudZoom, this.hudZoom);
    ctxHUD.translate(-this.W / 2, -this.H / 2);

    // === Hold Notes vencidas ===
    for (let i = 0; i < 4; i++) {
      if (this.lanesHeld[i].held && this.lanesHeld[i].holdNote) {
        const note = this.lanesHeld[i].holdNote;
        if (songPos > note.time + note.sustain + 100) {
          const idx = this.bfNotes.indexOf(note);
          if (idx !== -1) this.bfNotes.splice(idx, 1);
          this.score += 50;
          this.notesPassed++;
          this.addRatingSprite(30);
          this.lanesHeld[i].held = false;
          this.lanesHeld[i].holdNote = null;
        }
      }
    }

    // === Eliminar notas que se pasaron ===
    for (let i = this.bfNotes.length - 1; i >= 0; i--) {
      const note = this.bfNotes[i];
      if (note.hit) continue;
      const isHold = note.sustain > 0;

      if (!isHold && songPos > note.time + this.hitWindow) {
        this.bfNotes.splice(i, 1);
        this.misses++;
        this.targetHealth = Math.max(0, this.targetHealth - 0.5);
      }

      if (isHold && songPos > note.time + note.sustain + 200) {
        const laneIdx = note.lane - 4;
        const isBeingHeld = this.lanesHeld[laneIdx]?.holdNote === note;
        if (!isBeingHeld) {
          this.bfNotes.splice(i, 1);
          this.misses++;
          this.targetHealth = Math.max(0, this.targetHealth - 0.5);
        }
      }
    }
// === Notas de Dad (auto-hit + animación) ===
for (let i = this.dadNotes.length - 1; i >= 0; i--) {
  const note = this.dadNotes[i];
  if (note.hit) continue;

  // Si ya llegó el tiempo de esa nota
  if (songPos >= note.time - this.hitWindow && songPos <= note.time + this.hitWindow) {
    note.hit = true;

    // Animación según la lane
    const anims = ["singLEFT", "singDOWN", "singUP", "singRIGHT"];
    if (this.dad) {
      this.dad.play(anims[note.lane]);
    }

    // Borrar la nota (como ya fue tocada por Dad)
    this.dadNotes.splice(i, 1);
  }
}

// Reset de Dad a idle si no está en sing
if (this.dad && this.dad.currentAnim && this.dad.currentAnim.startsWith("sing")) {
  // Si quieres que vuelva a idle después de 0.2s aprox
  if (!this.dad.animTimer || this.dad.animTimer <= 0) {
    this.dad.animTimer = 0.2; // segundos
  } else {
    this.dad.animTimer -= delta;
    if (this.dad.animTimer <= 0) {
      this.dad.play("idle");
      this.dad.animTimer = null;
    }
  }
}

    // === Dibujar notas y receptores ===
    if (window.NotesAssets?.imageLoaded && window.NotesAssets?.framesLoaded) {
      const strumSpacing = Math.min(this.W * 0.08, 100);
      const strumSize = strumSpacing;
      const holdWidth = strumSize * 0.4;
      const startX_opp = this.W * 0.1;
      const startX_player = this.W - strumSpacing * 4 - this.W * 0.1;

      this.renderStrums(this.ctxHUD, this.dadReceptorY, strumSize, startX_opp, strumSpacing, this.laneStates, false, delta);
      this.renderNotes(this.ctxHUD, this.dadNotes, false, startX_opp, strumSpacing, strumSize, holdWidth, this.dadReceptorY, songPos, true);

      this.renderStrums(this.ctxHUD, this.bfReceptorY, strumSize, startX_player, strumSpacing, this.laneStates, true, delta);
      this.renderNotes(this.ctxHUD, this.bfNotes, true, startX_player, strumSpacing, strumSize, holdWidth, this.bfReceptorY, songPos, true);

      for (const name in window.luaSprites) {
        const s = window.luaSprites[name];
        if (s.visible && s.img.complete) {
          this.ctxGame.drawImage(s.img, s.x, s.y, s.width, s.height);
        }
      }

      // Rating sprites
      for (let i = this.ratingSprites.length - 1; i >= 0; i--) {
        const s = this.ratingSprites[i];
        s.timer += delta;
        s.vy += s.gravity;
        s.y += s.vy;
        if (s.timer > 0.3) s.alpha -= 0.02;
        if (s.alpha <= 0) {
          this.ratingSprites.splice(i, 1);
          continue;
        }
        this.ctxHUD.globalAlpha = s.alpha;
        this.ctxHUD.drawImage(s.img, s.x, s.y, 100, 50);
        this.ctxHUD.globalAlpha = 1;
      }

      // Texto HUD
      this.ctxHUD.fillStyle = "#fff";
      this.ctxHUD.font = "20px Arial";
      const hudTextY = this.healthBar.y + this.healthBar.barHeight + 30;
      const accuracy = this.calculateAccuracy();
      this.ctxHUD.textAlign = "center";
      this.ctxHUD.fillText(`Score: ${this.score} | Misses: ${this.misses} | Accuracy: ${accuracy}%`, this.W / 2, hudTextY);
      this.ctxHUD.textAlign = "start";
    }

    this.healthBar.update();
    this.healthBar.drawTo(this.ctxHUD);
    this.drawProgressBar(this.ctxHUD);

    // Iconos de vida
    if (this.iconP1 && this.iconP2) {
      this.updateHealthIcons();
      const iconW = this.iconP1.width || 75;
      const iconH = this.iconP1.height || 75;

      this.ctxHUD.save();
      this.ctxHUD.translate(this.iconP1.x + iconW / 2, this.iconP1.y + iconH / 2);
      this.ctxHUD.scale(this.hudZoom, this.hudZoom);
      this.ctxHUD.translate(-iconW / 2, -iconH / 2);
      this.iconP1.draw(this.ctxHUD, this.playerMaxHealth > 0 ? this.playerHealth / this.playerMaxHealth : 0.5, true);
      this.ctxHUD.restore();

      this.ctxHUD.save();
      this.ctxHUD.translate(this.iconP2.x + iconW / 2, this.iconP2.y + iconH / 2);
      this.ctxHUD.scale(-this.hudZoom, this.hudZoom);
      this.ctxHUD.translate(-iconW / 2, -iconH / 2);
      this.iconP2.draw(this.ctxHUD, this.playerMaxHealth > 0 ? this.playerHealth / this.playerMaxHealth : 0.5, false);
      this.ctxHUD.restore();
    }
  }

  // ---------------------------------
  // Cálculos complementarios
  // ---------------------------------
  calculateAccuracy() {
    const totalHits = this.ratingsCount.sick + this.ratingsCount.good + this.ratingsCount.bad + this.ratingsCount.shit + this.misses;
    if (totalHits === 0) return 100;
    const weightedHits = this.ratingsCount.sick * 1 + this.ratingsCount.good * 0.75 + this.ratingsCount.bad * 0.5 + this.ratingsCount.shit * 0.25;
    return ((weightedHits / totalHits) * 100).toFixed(2);
  }

  // ---------------------------------
  // Dibujo de strums y notas
  // ---------------------------------
  renderStrums(ctxHUD, y, size, startX, spacing, laneStates, isPlayer, delta) {
    const NA = window.NotesAssets; // alias rápido
    for (let i = 0; i < 4; i++) {
      const dir = this.laneDirs[i];
      const x = startX + i * spacing;
      const state = laneStates[i];
      let frame;

      if (isPlayer) {
        if (state.state === "confirm" && NA?.animationsConfirm?.[dir]?.length) {
          frame = NA.animationsConfirm[dir][state.frameIdx % NA.animationsConfirm[dir].length];
        } else if (state.state === "press" && NA?.animationsPress?.[dir]?.length) {
          frame = NA.animationsPress[dir][state.frameIdx % NA.animationsPress[dir].length];
        } else {
          frame = NA?.framesMap?.[i];
        }
      } else {
        frame = NA?.framesMap?.[i];
      }
      if (!frame) continue;

      const fx = parseInt(frame.getAttribute("x"));
      const fy = parseInt(frame.getAttribute("y"));
      const fw = parseInt(frame.getAttribute("width"));
      const fh = parseInt(frame.getAttribute("height"));

      ctxHUD.drawImage(NA.notesImage, fx, fy, fw, fh, x, y, size, size);

      if (isPlayer && state.timer > 0) {
        state.timer--;
        if (state.timer % 3 === 0) state.frameIdx++;
        if (state.timer === 0) {
          state.state = "idle";
          state.frameIdx = 0;
        }
      }
    }

    // Dibujar BF
    if (this.boyfriend) {
      this.boyfriend.update(delta);
      this.boyfriend.draw(this.ctxGame);
    }
  }

  renderNotes(ctxHUD, notes, isPlayer, startX, spacing, size, holdWidth, receptorY, songPos, upwards) {
    const NA = window.NotesAssets; // alias
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i];
      const lane = isPlayer ? note.lane - 4 : note.lane;
      const x = startX + lane * spacing;
      const laneIndex = lane % 4;

      const yStart = this.calculateNoteY(note, songPos, receptorY, upwards);

      // Sustain
      if (note.sustain > 0) {
        if (songPos > note.time + note.sustain + 100) continue; // oculto

        let holdVisibleStartTime = note.time;
        const isBeingHeld = isPlayer && this.lanesHeld[note.lane - 4]?.holdNote === note;
        if (isBeingHeld) holdVisibleStartTime = Math.max(note.time, songPos);

        const sustainEndTime = note.time + note.sustain;
        const yStartHold = this.calculateNoteY({ time: holdVisibleStartTime }, songPos, receptorY, upwards);
        const yEnd = this.calculateNoteY({ time: sustainEndTime }, songPos, receptorY, upwards);

        const bodyHeight = Math.abs(yEnd - yStartHold);
        const bodyY = Math.min(yStartHold, yEnd) + size / 2;

        const piece = NA.holdPieces?.[laneIndex];
        if (piece) {
          const px = +piece.getAttribute("x");
          const py = +piece.getAttribute("y");
          const pw = +piece.getAttribute("width");
          const ph = +piece.getAttribute("height");
          ctxHUD.drawImage(NA.notesImage, px, py, pw, ph, x + (size - holdWidth) / 2, bodyY, holdWidth, bodyHeight);
        }

        if (songPos >= note.time && songPos <= note.time + note.sustain) {
          const end = NA.holdEnds?.[laneIndex];
          if (end) {
            const ex = +end.getAttribute("x");
            const ey = +end.getAttribute("y");
            const ew = +end.getAttribute("width");
            const eh = +end.getAttribute("height");
            ctxHUD.drawImage(NA.notesImage, ex, ey, ew, eh, x + (size - holdWidth) / 2, yEnd, holdWidth, size / 2);
          }
        }
      }

      // Cabeza
      if (!note.hit && note.time >= songPos - this.scrollDuration) {
        const frame = NA.framesMapColored?.[laneIndex];
        if (frame) {
          const fx = +frame.getAttribute("x");
          const fy = +frame.getAttribute("y");
          const fw = +frame.getAttribute("width");
          const fh = +frame.getAttribute("height");
          ctxHUD.drawImage(NA.notesImage, fx, fy, fw, fh, x, yStart, size, size);
        }
      }

      // Bot juega solo
      if (!isPlayer && songPos >= note.time) {
        notes.splice(i, 1);
        this.notesPassed++;
      }
    }
  }

  tryHitLane(lane) {
    const songPos = this.getSongPos();
    for (let i = 0; i < this.bfNotes.length; i++) {
      const note = this.bfNotes[i];
      if (note.lane - 4 !== lane || note.hit) continue;

      const diff = Math.abs(songPos - note.time);
      if (diff <= this.hitWindow) {
        // Animación confirm
        this.laneStates[lane].state = "confirm";
        this.laneStates[lane].timer = 6;
        this.laneStates[lane].frameIdx = 0;

        note.hit = true;
        this.bfNotes.splice(i, 1);

        if (note.sustain > 0) {
          this.lanesHeld[lane].holdNote = note;
        }

        this.addRatingSprite(diff);
        this.hitSound.currentTime = 0;
        this.hitSound.play();

        this.targetHealth = Math.min(this.playerMaxHealth, this.targetHealth + 3);

        const anims = ["singLEFT", "singDOWN", "singUP", "singRIGHT"];
        if (this.boyfriend) {
          this.boyfriend.play(anims[lane]);
          this.boyfriend.singTimer = this.boyfriend.data.sing_duration || 1;
        }
        return;
      }
    }

    // Fallo
    this.targetHealth = Math.max(0, this.targetHealth - 1.5);
    this.laneStates[lane].state = "press";
    this.laneStates[lane].timer = 4;
    this.laneStates[lane].frameIdx = 0;
  }

  handleMouseTouch(x) {
    const spacing = this.W / 4;
    const startX = (this.W - spacing * 4) / 2;
    const lane = Math.floor((x - startX) / spacing);
    if (lane >= 0 && lane < 4) {
      if (!this.lanesHeld[lane].held) {
        this.tryHitLane(lane);
        this.lanesHeld[lane].held = true;
      }
    }
  }

  handleTouches(touches) {
    const spacing = this.W / 4;
    const startX = (this.W - spacing * 4) / 2;
    const lanesThisTouch = [
      { held: false, holdNote: null },
      { held: false, holdNote: null },
      { held: false, holdNote: null },
      { held: false, holdNote: null },
    ];

    for (const t of touches) {
      const lane = Math.floor((t.clientX - startX) / spacing);
      if (lane >= 0 && lane < 4) {
        if (!this.lanesHeld[lane].held) {
          this.tryHitLane(lane);
          lanesThisTouch[lane] = { held: true, holdNote: null };
        }
        lanesThisTouch[lane].held = true;
      }
    }
    // ⚠️ Antes era const lanesHeld -> ahora sí podemos reasignar
    this.lanesHeld = lanesThisTouch;
  }
}

// -------------------------------------------------
// Opcional: favicon silencioso para evitar 404 en dev
// -------------------------------------------------
(function ensureFavicon() {
  const link = document.querySelector('link[rel="icon"]');
  if (!link) {
    const l = document.createElement("link");
    l.rel = "icon";
    // data URI transparente 16x16
    l.href = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAHElEQVQoz2NgGAXUB8QwCqb9T0YwGJgYoAqGAgA5yQOQkQnW7wAAAABJRU5ErkJggg==";
    document.head.appendChild(l);
  }
})();
