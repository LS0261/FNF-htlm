import { Character } from "../object/character.js";
import Paths from "../backend/paths.js";
import Bar from '../object/bar.js';
import HealthIcon  from '../object/healthIcon.js';
import ClientPrefs from '../backend/clientPrefs.js';
import { registerStageLuaFunctions } from "../luabridge/stageBridge.js";
import { Camera } from './camera.js'; // Ajusta la ruta si es necesario

const lua = fengari.lua;
const lauxlib = fengari.lauxlib;
const lualib = fengari.lualib;
const to_luastring = fengari.to_luastring;

const menuDiv = document.getElementById("menu");

export default class PlayState {
  constructor(canvasGame, canvasHUD) {

        this.canvasGame = document.createElement("canvas");
    this.ctxGame = this.canvasGame.getContext("2d");

    this.canvasHUD = document.createElement("canvas");
    this.ctxHUD = this.canvasHUD.getContext("2d");
    
const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);
registerStageLuaFunctions(L);

const FIXED_W = 1280;
const FIXED_H = 720;

const clientPrefs = new ClientPrefs();
clientPrefs.loadPrefs();
console.log(clientPrefs.data);

let W = FIXED_W;
let H = FIXED_H;

// Instancia cámaras (cada una crea su propio canvas)
const camGame = new Camera(0, 0, FIXED_W, FIXED_H, 1);
const camHUD = new Camera(0, 0, FIXED_W, FIXED_H, 2);

// Objeto que la cámara seguirá
const boyfriend = {
  pos: [FIXED_W / 2, FIXED_H / 2]
};

window.addEventListener('resize', () => {
  // No cambiar tamaño de canvas
  repositionHUD?.();
});

// Cargar archivo modchart.lua dinámicamente
fetch("data/songs/bopeebo-rumble/modchart.lua")
  .then(res => res.text())
  .then(modchart => {
    const result = lauxlib.luaL_dostring(L, to_luastring(modchart));
    if (result !== lua.LUA_OK) {
      const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
      console.error("Lua error:", err);
    } else {
      console.log("✅ Lua ejecutado correctamente desde archivo.");
    }
  });

const luaSprites = {};
window.luaSprites = luaSprites;

function render() {
  camGame.clear();
  camGame.follow(boyfriend.pos[0], boyfriend.pos[1]);
  camGame.begin();

  for (const name in luaSprites) {
    const spr = luaSprites[name];
    if (spr.visible && spr.img.complete) {
      camGame.ctx.drawImage(spr.img, spr.x, spr.y, spr.width, spr.height);
    }
  }

  camGame.end();

  camHUD.clear();
  camHUD.begin();

  // Aquí dibuja elementos HUD usando camHUD.ctx
  // drawHUD(camHUD.ctx);

  camHUD.end();

  requestAnimationFrame(render);
}
render();

function repositionHUD() {
  const barWidth = W * 0.6;
  const barHeight = 20;

  healthBar.barWidth = barWidth;
  healthBar.barHeight = barHeight;
  healthBar.x = (W - barWidth) / 2;
  healthBar.y = H - 50; // 🔽 Abajo
}

let fixedSpeed = 1.0;
let bpmSections = [];

let bfNotes = [];
let dadNotes = [];
let uiGroup = [];

let notesPassed = 0, totalNotes = 0;
let scrollDuration = 3000;
let anticipationMs = 0;
let lastTimestamp = 0;
let audioInst;
let playing = false;

let playerHealth = 50;
let targetHealth = 1;
const playerMaxHealth = 100;

let iconP1;
let iconP2;

//let boyfriend = null;
let gf = null;
let dad = null;

const hitWindow = 250; // ms de tolerancia para presionar una nota

const healthBar = new Bar(0, 0, 'healthBar', () => playerHealth, 0, playerMaxHealth);

healthBar.setColors('#f00', '#0f0');

const keyToLane = {
  "ArrowLeft": 0, "KeyA": 0,
  "ArrowDown": 1, "KeyS": 1,
  "ArrowUp": 2, "KeyK": 2,
  "ArrowRight": 3, "KeyL": 3
};

const lanesHeld = [
  { held: false, holdNote: null },
  { held: false, holdNote: null },
  { held: false, holdNote: null },
  { held: false, holdNote: null }
];

let hitSound 
hitSound = new Audio(Paths.hitsound);
hitSound.volume = 0.5;
let ratingSprites = [];

let laneStates = [
  { state: "idle", timer: 0, frameIdx: 0 },
  { state: "idle", timer: 0, frameIdx: 0 },
  { state: "idle", timer: 0, frameIdx: 0 },
  { state: "idle", timer: 0, frameIdx: 0 }
];

const laneDirs = ["left", "down", "up", "right"];
let score = 0;
let ratingsCount = { sick: 0, good: 0, bad: 0, shit: 0 };
let misses = 0;

let dadReceptorY = 100;
let bfReceptorY = dadReceptorY;
let baseDistance = Math.abs(bfReceptorY - 50);

// ▶ PLAY BUTTON
const playBtn = document.createElement("button");
playBtn.textContent = "▶ PLAY";
playBtn.style.position = "fixed";
playBtn.style.bottom = "50%";
playBtn.style.left = "50%";
playBtn.style.transform = "translate(-50%, 0)";
playBtn.style.fontSize = "30px";
playBtn.style.padding = "10px 30px";
document.body.appendChild(playBtn);
playBtn.style.display = "none";
playBtn.onclick = () => {
  if (audioInst) audioInst.play();
  playing = true;
  playBtn.style.display = "none";
};

// ⏸ PAUSE BUTTON
const pauseBtn = document.createElement("img");
pauseBtn.src = "images/pause.png";
pauseBtn.style.position = "fixed";
pauseBtn.style.top = "10px";
pauseBtn.style.right = "10px";
pauseBtn.style.width = "99px";
pauseBtn.style.height = "93px";
pauseBtn.style.cursor = "pointer";
pauseBtn.style.zIndex = "1000";
pauseBtn.style.display = "none"; // solo visible en PlayState
document.body.appendChild(pauseBtn);
pauseBtn.onclick = () => {
  playing = false;
  openPauseMenu(audioInst, () => { 
    playing = true; 
    pauseBtn.style.display = "block"; // Mostrar el botón al reanudar
  });
  pauseBtn.style.display = "none"; // Ocultar botón al pausar
};

function loadMenu() {
  fetch("data/weeks/weekList.json")
    .then(res => res.json())
    .then(json => {
      menuDiv.innerHTML = "<h2>Selecciona una week:</h2>";
      json.weeks.forEach(week => {
        week.songs.forEach(songEntry => {
          const songName = songEntry[0];
          const btn = document.createElement("button");
          btn.textContent = `${week.weekName} - ${songName}`;
          btn.onclick = () => startSong(songName.toLowerCase());
          menuDiv.appendChild(btn);
        });
      });
    })
    .catch(err => {
      console.error("Error cargando weekList.json:", err);
      menuDiv.innerHTML = "<p>Error cargando weeks.</p>";
    });
}

function startSong(songName) {
  menuDiv.style.display = "none";
  pauseBtn.style.display = "block";
  startPlay(songName);
}

async function startPlay(songName) {
  // Cargar el JSON de la canción primero para obtener el stage
  const res = await fetch(Paths.songJSON(songName));
  const json = await res.json();

  // Definir el stageName desde el JSON o usar uno por defecto
  let stageName = json.song.stage || "stage"; // Usa "stage" si no se especifica
let bfPos, gfPos, dadPos;
let camBF, camGF, camDad;
let cameraSpeed = 1;
let hideGF = false;

  // Inicialización de variables importantes
  bfNotes = [];
  dadNotes = [];
  notesPassed = 0;
  totalNotes = 0;
  playing = false;
  ratingSprites = [];
  laneStates = laneStates.map(() => ({ state: "idle", timer: 0, frameIdx: 0 }));
  score = 0;
  ratingsCount = { sick: 0, good: 0, bad: 0, shit: 0 };
  misses = 0;

  // Cargar audio instrumental
  let instPath = `songs/${songName}/Inst.ogg`;
  audioInst = new Audio(Paths.songInst(songName)); // ✅ CORRECTO
  audioInst.volume = 0.5;

  // Intentar cargar el stage
  try {
    const stageData = await loadJSON(Paths.stageJSON(stageName));
    const positions = loadStagePositions(stageData);

    try {
  const luaText = await fetch(`scripts/stages/${stageName}.lua`).then(r => r.text());
  const result = lauxlib.luaL_dostring(L, to_luastring(luaText));
  if (result !== lua.LUA_OK) {
    const err = fengari.to_jsstring(lua.lua_tostring(L, -1));
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

  // Cargar personajes
  //boyfriend = await new Character('bf', bfPos[0], bfPos[1], 'BF');
  //dad = await new Character('dad', dadPos[0], dadPos[1], 'DAD');
  //if (!hideGF)
    //gf = await new Character('gf', gfPos[0], gfPos[1], 'GF');

  try {
    boyfriend = new Character('bf', true);
    await boyfriend.init();
    boyfriend.pos = bfPos;
  } catch (e) {
    console.warn("No se pudo cargar el personaje, usando BF por defecto.");
    boyfriend = new Character('bf', true);
    await boyfriend.init();
    boyfriend.pos = bfPos;
  }

  try {
    dad = new Character('dad', false);
    await dad.init();
    dad.pos = dadPos;
  } catch (e) {
    console.warn("No se pudo cargar el personaje Dad, usando BF por defecto.");
    dad = new Character('bf', false);
    await dad.init();
    dad.pos = dadPos;
  }

if (!hideGF) {
  try {
    // Ajusta la posición de GF respecto a BF
    gf = new Character('gf', false);
    await gf.init();
    // Coloca GF a la izquierda y arriba de BF
    gf.pos = [bfPos[0] - 150, bfPos[1] - 120];
  } catch (e) {
    console.warn("No se pudo cargar GF, usando BF por defecto.");
    gf = new Character('bf', false);
    await gf.init();
    gf.pos = [bfPos[0] - 150, bfPos[1] - 120];
  }
}

iconP1 = await new HealthIcon(boyfriend.healthIcon, true);
iconP1.y = healthBar.y - 75;
iconP1.visible = !(clientPrefs?.data?.hideHud ?? false);
iconP1.alpha = clientPrefs.data.healthBarAlpha;
uiGroup.push(iconP1);

iconP2 = await new HealthIcon(dad.healthIcon, false);
iconP2.y = healthBar.y - 75;
iconP2.visible = !(clientPrefs?.data?.hideHud ?? false);
iconP2.alpha = clientPrefs.data.healthBarAlpha;
uiGroup.push(iconP2);

  // Evento al finalizar canción
  audioInst.onended = async () => {
    playing = false;
    pauseBtn.style.display = "none";
    canvasGame.style.display = "none";
    menuDiv.style.display = "block";
    playBtn.style.display = "none";

    bfNotes = [];
    dadNotes = [];
    notesPassed = 0;
    totalNotes = 0;
  };

  // Configuración de notas
  let speedMultiplier = json.song.speed || 1;
  fixedSpeed = speedMultiplier * 0.25;
  scrollDuration = 2000 / speedMultiplier;
  baseDistance = Math.abs(bfReceptorY - 30);

  // BPM
  let bpm = json.song.bpm || 120;
  beatLength = 60000 / bpm * 2;

  json.song.notes.forEach(section => {
    section.sectionNotes.forEach(note => {
      let time = note[0] + anticipationMs;
      let lane = note[1];
      let sustain = note[2];

      if (section.mustHitSection) {
        if (lane < 4) lane += 4;
        else lane -= 4;
      }

      let noteObj = { time, lane, sustain, hit: false };
      if (lane < 4) {
        dadNotes.push(noteObj);
      } else {
        bfNotes.push(noteObj);
      }
    });
  });

  totalNotes = bfNotes.length;

  // BPM dinámico
  bpmSections = [];
  json.song.notes.forEach(section => {
    if (section.changeBPM) {
      let firstNoteTime = section.sectionNotes.length > 0 ? section.sectionNotes[0][0] : 0;
      bpmSections.push({
        time: firstNoteTime + anticipationMs,
        bpm: section.bpm
      });
    }
  });

  if (bpmSections.length === 0)
    bpmSections.push({ time: 0, bpm: bpm });

  lastBeatTime = 0;
  beatCount = 0;

  // Mostrar botón de pausa
  playBtn.style.display = "block";

  // Iniciar loop
  lastTimestamp = performance.now();
  repositionHUD();
  requestAnimationFrame(loop);
}

// INPUT con lanesHeld
camGame.canvas.addEventListener("mousedown", e => handleMouseTouch(e.clientX));
camGame.canvas.addEventListener("mousemove", e => { if (e.buttons) handleMouseTouch(e.clientX); });
camGame.canvas.addEventListener("mouseup", () => {
  lanesHeld = lanesHeld.map(() => ({ held: false, holdNote: null }));
});
camGame.canvas.addEventListener("touchstart", e => {
  handleTouches(e.touches);
  e.preventDefault();
}, { passive: false });

camGame.canvas.addEventListener("touchmove", e => {
  handleTouches(e.touches);
  e.preventDefault();
}, { passive: false });

camGame.canvas.addEventListener("touchend", () => {
  for (let i = 0; i < 4; i++) {
    if (lanesHeld[i].held && lanesHeld[i].holdNote) {
      const note = lanesHeld[i].holdNote;
      const songPos = getSongPos();
      if (songPos >= note.time && songPos <= note.time + note.sustain + 150) {
        score += 50;
        notesPassed++;
        //addRatingSprite(30);
      } else {
        misses++;
        targetHealth = Math.max(0, targetHealth - 0.5);
      }
      const idx = bfNotes.indexOf(note);
      if (idx !== -1) bfNotes.splice(idx, 1);
    }
    lanesHeld[i].held = false;
    lanesHeld[i].holdNote = null;
  }
});
document.addEventListener("keydown", (e) => {
  const lane = keyToLane[e.code];
  if (lane !== undefined) {
    if (!lanesHeld[lane].held) {
      lanesHeld[lane].held = true;
      tryHitLane(lane);
    }
  }

  // Reproducir animación idle de bf al presionar X
  if (e.code === "KeyX") {
    if (boyfriend) {
      console.log("[TRACE] Se presionó X, se llama a boyfriend.play('idle')");
      boyfriend.play("idle");
      console.log("[TRACE] Estado actual:", {
        animName: boyfriend.animName,
        frameIndex: boyfriend.frameIndex,
        animTimer: boyfriend.animTimer,
        loaded: boyfriend.loaded,
        frames: boyfriend.frames["idle"]?.length
      });
    }
  }
});
document.addEventListener("keydown", (e) => {
  const lane = keyToLane[e.code];
  if (lane !== undefined) {
    if (!lanesHeld[lane].held) {
      lanesHeld[lane].held = true;
      tryHitLane(lane);
    }
  }
});

document.addEventListener("keyup", (e) => {
  const lane = keyToLane[e.code];
  if (lane !== undefined) {
    if (lanesHeld[lane].held) {
      lanesHeld[lane].held = false;

      // Si había un holdNote y se soltó antes de tiempo: cuenta como fallo
      const heldNote = lanesHeld[lane].holdNote;
if (heldNote) {
  const songPos = getSongPos();
  const idx = bfNotes.indexOf(heldNote);
  if (idx !== -1) bfNotes.splice(idx, 1);

  if (songPos >= heldNote.time && songPos <= heldNote.time + heldNote.sustain + 150) {
    // Acierto
    score += 50;
    notesPassed++;
    addRatingSprite(30);
  } else {
    // Fallo
    misses++;
    targetHealth = Math.max(0, targetHealth - 0.5);
  }
  lanesHeld[lane].holdNote = null;
}
    }
  }
});

function handleMouseTouch(x) {
  let spacing = W / 4;
  let startX = (W - spacing * 4) / 2;
  let lane = Math.floor((x - startX) / spacing);
  if (lane >= 0 && lane < 4) {
    if (!lanesHeld[lane].held) {
      tryHitLane(lane);      lanesHeld[lane].held = true;
    }
  }
}

function handleTouches(touches) {
  let spacing = W / 4;
  let startX = (W - spacing * 4) / 2;
  let lanesThisTouch = [
    { held: false, holdNote: null },
    { held: false, holdNote: null },
    { held: false, holdNote: null },
    { held: false, holdNote: null }
  ];

  for (let t of touches) {
    let lane = Math.floor((t.clientX - startX) / spacing);
    if (lane >= 0 && lane < 4) {
      if (!lanesHeld[lane].held) {
        tryHitLane(lane);
        lanesThisTouch[lane] = { held: true, holdNote: null }; // Aquí puedes mejorar para holdNote
      }
      lanesThisTouch[lane].held = true;
    }
  }
  lanesHeld = lanesThisTouch;
}

function getSongPos() {
  return audioInst ? audioInst.currentTime * 1000 : 0;
}

function addRatingSprite(diff) {
  let type;
  if (diff <= 60) type = "sick";
  else if (diff <= 120) type = "good";
  else if (diff <= 180) type = "bad";
  else if (diff <= hitWindow) type = "shit";
  else type = "miss"; // fuera del rango aceptable, pero por seguridad

  ratingsCount[type] = (ratingsCount[type] || 0) + 1;

  if (type === "sick") score += 350;
  else if (type === "good") score += 200;
  else if (type === "bad") score += 100;
  else if (type === "shit") score += 50;

  // Mostrar sprite con animación tipo "salto y caída lenta"
  if (type !== "miss" && NotesAssets.ratingsImages[type]) {
    ratingSprites.push({
      img: NotesAssets.ratingsImages[type],
      x: W / 2 - 50,   // centrado ajustado
      y: H / 3,        // posición base
      vy: -1.2,        // impulso hacia arriba
      gravity: 0.05,   // gravedad suave (pluma)
      alpha: 1,
      timer: 0
    });
  }
}

function getProgress() {
  if (!audioInst || !audioInst.duration) return 0;
  return audioInst.currentTime / audioInst.duration;
}

function drawProgressBar() {
  const progress = getProgress();
  const barWidth = W * 0.8;
  const barHeight = 20;
  const x = W * 0.1;
  const y = 20;

  // Fondo de la barra
  ctxHUD.fillStyle = "#444";
  ctxHUD.fillRect(x, y, barWidth, barHeight);

  // Barra de progreso
  ctxHUD.fillStyle = "#0f0";
  ctxHUD.fillRect(x, y, barWidth * progress, barHeight);

  // Borde
  ctxHUD.strokeStyle = "#000";
  ctxHUD.lineWidth = 2;
  ctxHUD.strokeRect(x, y, barWidth, barHeight);
}

function calculateNoteY(note, songPos, receptorY, upwards) {
  let speed = fixedSpeed;
  let timeDiff = note.time - songPos;
  return upwards
    ? receptorY + timeDiff * speed
    : receptorY - timeDiff * speed;
}

// Variables para HUD zoom + metronome
let hudZoom = 1;
let hudZoomTarget = 1;
let beatLength = 60000 / 120; // ms por beat
let lastBeatTime = 0;
let beatCount = 0;

let metronome1 = new Audio(Paths.metronome1);
let metronome2 = new Audio(Paths.metronome2);

function loop(timestamp) {
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  requestAnimationFrame(loop);
  if (!playing) return;

  // Reset canvas
// --- GAME LAYER ---
 this.ctxGame.setTransform(1, 0, 0, 1, 0, 0)
 ctxGame.clearRect(0, 0, W, H);          // Clear screen

camGame.begin(ctxGame); // 🔽 Aplica transformaciones de cámara del juego

if (boyfriend?.draw) boyfriend.draw(ctxGame);
// draw dad, gf, escenario, notas, etc.

camGame.end(ctxGame); // 🔼 Restaura transformaciones originales

// --- HUD LAYER ---
ctxHUD.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
ctxHUD.clearRect(0, 0, canvasHUD.width, canvasHUD.height);

camHUD.begin(ctxHUD); // 🔽 Cámara HUD (normalmente sin movimiento, zoom fijo)

healthBar.drawTo(ctxHUD);
drawProgressBar(ctxHUD);
// draw score, icons, etc.

camHUD.end(ctxHUD); // 🔼 Fin de transformaciones HUD

  // === Actualizar personajes ===
  if (boyfriend?.update) boyfriend.update(delta);
  if (boyfriend?.draw) boyfriend.draw(ctxGame);

  let songPos = getSongPos();

  // === BPM dinámico ===
  let currentBpm = bpmSections[0].bpm;
  let currentBeatLength = 60000 / currentBpm;

  for (let i = 0; i < bpmSections.length; i++) {
    if (songPos >= bpmSections[i].time) {
      currentBpm = bpmSections[i].bpm;
      currentBeatLength = 60000 / currentBpm;
    } else break;
  }

  // === Beat logic (zoom, metronome) ===
  if ((songPos - lastBeatTime) >= (currentBeatLength - 5)) {
    beatCount = (beatCount + 1) % 4;

    hudZoom = (beatCount === 0) ? 1.1 : (beatCount === 2 ? 1.05 : 1.0);
    if (beatCount === 0) metronome1.currentTime = 0;
    if (beatCount === 2) metronome2.currentTime = 0;

    hudZoomTarget = 1;
    lastBeatTime += currentBeatLength;

    if (songPos - lastBeatTime > currentBeatLength) {
      lastBeatTime = songPos;
    }

    // Puedes reiniciar la animación aquí si lo deseas:
    // if (boyfriend) boyfriend.play("idle");
  }

  const smoothSpeed = 3;
  playerHealth += (targetHealth - playerHealth) * smoothSpeed * delta;

  if (Math.abs(targetHealth - playerHealth) < 0.001) {
    playerHealth = targetHealth;
  }

  // === Zoom del HUD ===
  hudZoom += (hudZoomTarget - hudZoom) * 0.07;
  ctxHUD.setTransform(1, 0, 0, 1, 0, 0);
  ctxHUD.clearRect(0, 0, W, H);
  ctxHUD.translate(W / 2, H / 2);
  ctxHUD.scale(hudZoom, hudZoom);
  ctxHUD.translate(-W / 2, -H / 2);

  // === Hold Notes vencidas ===
  for (let i = 0; i < 4; i++) {
    if (lanesHeld[i].held && lanesHeld[i].holdNote) {
      const note = lanesHeld[i].holdNote;
      if (songPos > note.time + note.sustain + 100) {
        const idx = bfNotes.indexOf(note);
        if (idx !== -1) bfNotes.splice(idx, 1);

        score += 50;
        notesPassed++;
        addRatingSprite(30);

        lanesHeld[i].held = false;
        lanesHeld[i].holdNote = null;
      }
    }
  }

  // === Eliminar notas que se pasaron ===
  for (let i = bfNotes.length - 1; i >= 0; i--) {
    let note = bfNotes[i];
    if (note.hit) continue;

    const isHold = note.sustain > 0;

    if (!isHold && songPos > note.time + hitWindow) {
      bfNotes.splice(i, 1);
      misses++;
      targetHealth = Math.max(0, targetHealth - 0.5);
    }

    if (isHold && songPos > note.time + note.sustain + 200) {
      const laneIdx = note.lane - 4;
      const isBeingHeld = lanesHeld[laneIdx]?.holdNote === note;

      if (!isBeingHeld) {
        bfNotes.splice(i, 1);
        misses++;
        targetHealth = Math.max(0, targetHealth - 0.5);
      }
    }
  }

  // === Dibujar notas y receptores ===
  if (NotesAssets.imageLoaded && NotesAssets.framesLoaded) {
    let strumSpacing = Math.min(W * 0.08, 100);
    let strumSize = strumSpacing;
    let holdWidth = strumSize * 0.4;
    let startX_opp = W * 0.1;
    let startX_player = W - (strumSpacing * 4) - W * 0.1;

    renderStrums(dadReceptorY, strumSize, startX_opp, strumSpacing, laneStates, false, delta);
    renderNotes(dadNotes, false, startX_opp, strumSpacing, strumSize, holdWidth, dadReceptorY, songPos, true);

    renderStrums(bfReceptorY, strumSize, startX_player, strumSpacing, laneStates, true, delta);
    renderNotes(bfNotes, true, startX_player, strumSpacing, strumSize, holdWidth, bfReceptorY, songPos, true);

    for (const name in window.luaSprites) {
      const s = window.luaSprites[name];
      if (s.visible && s.img.complete) {
        ctxGame.drawImage(s.img, s.x, s.y, s.width, s.height);
      }
    }
    for (let i = ratingSprites.length - 1; i >= 0; i--) {
      const s = ratingSprites[i];

      s.timer += delta;
      s.vy += s.gravity;
      s.y += s.vy;

      if (s.timer > 0.3) {
        s.alpha -= 0.02;
      }

      if (s.alpha <= 0) {
        ratingSprites.splice(i, 1);
        continue;
      }

      ctxHUD.globalAlpha = s.alpha;
      ctxHUD.drawImage(s.img, s.x, s.y, 100, 50);
      ctxHUD.globalAlpha = 1;
    }

    ctxHUD.fillStyle = "#fff";
    ctxHUD.font = "20px Arial";
    const hudTextY = healthBar.y + healthBar.barHeight + 30;
    const accuracy = calculateAccuracy();

    ctxHUD.textAlign = "center";
    ctxHUD.fillText(
      `Score: ${score} | Misses: ${misses} | Accuracy: ${accuracy}%`,
      W / 2,
      hudTextY
    );
    ctxHUD.textAlign = "start";
  }

  healthBar.update();
  healthBar.drawTo(ctxHUD);
  drawProgressBar();

  let healthPercent = playerMaxHealth > 0 ? playerHealth / playerMaxHealth : 0.5;
  if (!isFinite(healthPercent) || isNaN(healthPercent)) healthPercent = 0.5;
  healthPercent = Math.max(0, Math.min(1, healthPercent));

  const iconOffset = 300 * healthPercent;

  if (iconP1 && iconP2) {
    const iconW = iconP1.width || 75;
    const iconH = iconP1.height || 75;

    updateHealthIcons();

    ctxHUD.save();
    ctxHUD.translate(iconP1.x + iconW / 2, iconP1.y + iconH / 2);
    ctxHUD.scale(hudZoom, hudZoom);
    ctxHUD.translate(-iconW / 2, -iconH / 2);
    iconP1.draw(ctxHUD, healthPercent, true);
    ctxHUD.restore();

    ctxHUD.save();
    ctxHUD.translate(iconP2.x + iconW / 2, iconP2.y + iconH / 2);
    ctxHUD.scale(-hudZoom, hudZoom);
    ctxHUD.translate(-iconW / 2, -iconH / 2);
    iconP2.draw(ctxHUD, healthPercent, false);
    ctxHUD.restore();
  }
}

function calculateAccuracy() {
  const totalHits = ratingsCount.sick + ratingsCount.good + ratingsCount.bad + ratingsCount.shit + misses;
  if (totalHits === 0) return 100;
  
  const weightedHits =
    ratingsCount.sick * 1 +
    ratingsCount.good * 0.75 +
    ratingsCount.bad * 0.5 +
    ratingsCount.shit * 0.25;

  return ((weightedHits / totalHits) * 100).toFixed(2);
}


function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function updateHealthIcons() {
  const healthPercent = clamp(playerHealth / playerMaxHealth, 0, 1);
  const barX = healthBar.x + healthBar.barOffset.x;
  const barY = healthBar.y + healthBar.barOffset.y;
  const barW = healthBar.barWidth;
  const iconW = iconP1.width || 75;
  const iconH = iconP1.height || 75;
  const iconY = barY - 40;

  // Limita para que iconos no salgan de la barra ni de la cámara
  const clampX = (x) => Math.max(barX, Math.min(x, barX + barW - iconW));

  // Posiciones de los iconos
  const p1X = clampX(barX + (1 - healthPercent) * barW);
  const p2X = clampX(barX + healthPercent * barW);

  iconP1.x = p1X;
  iconP2.x = p2X;
  iconP1.y = iconY;
  iconP2.y = iconY;
}

function update(delta) {
  beatTimer += delta;
  if (beatTimer >= 60 / bpm) {
    beatTimer = 0;
    if (bf) bf.play("idle"); // animación de beat
  }

  if (bf) bf.update(delta);
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (bf) bf.draw(ctx);
}
function renderStrums(y, size, startX, spacing, laneStates, isPlayer, delta) {
  for (let i = 0; i < 4; i++) {
    let dir = laneDirs[i];
    let x = startX + i * spacing;
    let state = laneStates[i];
    let frame;

    if (isPlayer) {
      if (
        state.state === "confirm" &&
        NotesAssets.animationsConfirm?.[dir]?.length
      ) {
        frame = NotesAssets.animationsConfirm[dir][
          state.frameIdx % NotesAssets.animationsConfirm[dir].length
        ];
      } else if (
        state.state === "press" &&
        NotesAssets.animationsPress?.[dir]?.length
      ) {
        frame = NotesAssets.animationsPress[dir][
          state.frameIdx % NotesAssets.animationsPress[dir].length
        ];
      } else {
        frame = NotesAssets.framesMap?.[i];
      }
    } else {
      frame = NotesAssets.framesMap?.[i];
    }

    if (!frame) continue;

    let fx = parseInt(frame.getAttribute("x"));
    let fy = parseInt(frame.getAttribute("y"));
    let fw = parseInt(frame.getAttribute("width"));
    let fh = parseInt(frame.getAttribute("height"));

    ctxHUD.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x, y, size, size);

    if (isPlayer && state.timer > 0) {
      state.timer--;
      if (state.timer % 3 === 0) state.frameIdx++;
      if (state.timer === 0) {
        state.state = "idle";
        state.frameIdx = 0;
      }
    }
  }
  if (boyfriend) {
    boyfriend.update(delta);
    boyfriend.draw(ctxGame);
  }
}
function renderNotes(notes, isPlayer, startX, spacing, size, holdWidth, receptorY, songPos, upwards) {
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];
    const lane = isPlayer ? note.lane - 4 : note.lane;
    const x = startX + lane * spacing;
    const laneIndex = lane % 4;

    const yStart = calculateNoteY(note, songPos, receptorY, upwards);

if (note.sustain > 0) {
  // Si ya terminó la nota y pasó 100ms, ni la dibujes
  if (songPos > note.time + note.sustain + 100) continue;

  let holdVisibleStartTime = note.time;

  const isBeingHeld = isPlayer && lanesHeld[note.lane - 4]?.holdNote === note;
  if (isBeingHeld) {
    holdVisibleStartTime = Math.max(note.time, songPos);
  }

  const sustainEndTime = note.time + note.sustain;

  const yStartHold = calculateNoteY({ time: holdVisibleStartTime }, songPos, receptorY, upwards);
  const yEnd = calculateNoteY({ time: sustainEndTime }, songPos, receptorY, upwards);

  const bodyHeight = Math.abs(yEnd - yStartHold);
  const bodyY = Math.min(yStartHold, yEnd) + size / 2;

  const piece = NotesAssets.holdPieces[laneIndex];
  if (piece) {
    const px = +piece.getAttribute("x");
    const py = +piece.getAttribute("y");
    const pw = +piece.getAttribute("width");
    const ph = +piece.getAttribute("height");

    ctxHUD.drawImage(
      NotesAssets.notesImage,
      px, py, pw, ph,
      x + (size - holdWidth) / 2, bodyY,
      holdWidth, bodyHeight
    );
  }

  // ✅ Ahora, antes de dibujar el end, verificamos si ya pasó el tiempo
  if (songPos >= note.time && songPos <= note.time + note.sustain) {
    const end = NotesAssets.holdEnds[laneIndex];
    if (end) {
      const ex = +end.getAttribute("x");
      const ey = +end.getAttribute("y");
      const ew = +end.getAttribute("width");
      const eh = +end.getAttribute("height");
      ctxHUD.drawImage(
        NotesAssets.notesImage,
        ex, ey, ew, eh,
        x + (size - holdWidth) / 2, yEnd,
        holdWidth, size / 2
      );
    }
  }
}

    // === Cabeza de la nota ===
    if (!note.hit && note.time >= songPos - scrollDuration) {
      const frame = NotesAssets.framesMapColored[laneIndex];
      if (frame) {
        const fx = +frame.getAttribute("x");
        const fy = +frame.getAttribute("y");
        const fw = +frame.getAttribute("width");
        const fh = +frame.getAttribute("height");
        ctxHUD.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x, yStart, size, size);
      }
    }

    if (!isPlayer && songPos >= note.time) {
      notes.splice(i, 1);
      notesPassed++;
    }
  }
}

function tryHitLane(lane) {
  const songPos = getSongPos();
  for (let i = 0; i < bfNotes.length; i++) {
    const note = bfNotes[i];
    if (note.lane - 4 !== lane || note.hit) continue;

    const diff = Math.abs(songPos - note.time);
    if (diff <= hitWindow) {
      // Animación confirm
      laneStates[lane].state = "confirm";
      laneStates[lane].timer = 6;
      laneStates[lane].frameIdx = 0;

      note.hit = true;
      bfNotes.splice(i, 1);

      if (note.sustain > 0) {
        lanesHeld[lane].holdNote = note;
      }

      addRatingSprite(diff);
      hitSound.currentTime = 0;
      hitSound.play();

      targetHealth = Math.min(playerMaxHealth, targetHealth + 3);

      // --- Animación de canto según lane ---
      const anims = ["singLEFT", "singDOWN", "singUP", "singRIGHT"];
      if (boyfriend) {
        boyfriend.play(anims[lane]);
        boyfriend.singTimer = boyfriend.data.sing_duration || 4; // segundos
      }

      return;
    }
  }

  // Si fallaste, bajamos la vida objetivo
  targetHealth = Math.max(0, targetHealth - 1.5);

  // Animación press
  laneStates[lane].state = "press";
  laneStates[lane].timer = 4;
  laneStates[lane].frameIdx = 0;
}

function getNoteAnim(lane) {
  return ["singLEFT", "singDOWN", "singUP", "singRIGHT"][lane];
}

// Carga de imagenes, sprites y ratings aquí...
// (asume que ya está hecho)

loadMenu();
requestAnimationFrame(loop);

}}