import { Character } from "../object/character.js";
import Paths from "../backend/paths.js";
import Bar from '../object/bar.js';
import HealthIcon  from '../object/healthIcon.js';
import ClientPrefs from '../backend/clientPrefs.js';
import { registerStageLuaFunctions } from "../luabridge/stageBridge.js";

const lua = fengari.lua;
const lauxlib = fengari.lauxlib;
const lualib = fengari.lualib;
const to_luastring = fengari.to_luastring;

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);
registerStageLuaFunctions(L);

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const menuDiv = document.getElementById("menu");

const clientPrefs = new ClientPrefs();
clientPrefs.loadPrefs();  // Carga la configuración guardada
console.log(clientPrefs.data);  // Debería mostrar un objeto con hideHud, healthBarAlpha, etc.

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

for (const name in luaSprites) {
  const spr = luaSprites[name];
  if (spr.visible && spr.img.complete) {
    ctx.drawImage(spr.img, spr.x, spr.y, spr.width, spr.height);
  }
}

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

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  repositionHUD(); // 💡 reposicionar elementos
});

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
const playerMaxHealth = 100;

let iconP1;
let iconP2;

let boyfriend = null;
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
  canvas.style.display = "block";
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
  boyfriend = await new Character('bf', bfPos[0], bfPos[1], 'BF');
  dad = await new Character('dad', dadPos[0], dadPos[1], 'DAD');
  if (!hideGF)
    gf = await new Character('gf', gfPos[0], gfPos[1], 'GF');
  
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
    canvas.style.display = "none";
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
canvas.addEventListener("mousedown", e => handleMouseTouch(e.clientX));
canvas.addEventListener("mousemove", e => { if (e.buttons) handleMouseTouch(e.clientX); });
canvas.addEventListener("mouseup", () => {
  lanesHeld = lanesHeld.map(() => ({ held: false, holdNote: null }));
});
canvas.addEventListener("touchstart", e => {
  handleTouches(e.touches);
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  handleTouches(e.touches);
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", () => {
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
        playerHealth -= 0.5;
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
    playerHealth -= 0.5;
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

  // Mostrar sprite
  if (type !== "miss" && NotesAssets.ratingsImages[type]) {
    ratingSprites.push({
      img: NotesAssets.ratingsImages[type],
      x: W / 2 + (Math.random() * 40 - 20),
      y: H / 2,
      alpha: 1,
      vy: -1,
      vx: Math.random() * 2 - 1
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
  ctx.fillStyle = "#444";
  ctx.fillRect(x, y, barWidth, barHeight);

  // Barra de progreso
  ctx.fillStyle = "#0f0";
  ctx.fillRect(x, y, barWidth * progress, barHeight);

  // Borde
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barWidth, barHeight);
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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // === Actualizar personajes ===
  if (boyfriend?.update) boyfriend.update(delta);
  if (boyfriend?.draw) boyfriend.draw(ctx);

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

    boyfriend?.dance?.();
  }

  // === Zoom del HUD ===
  hudZoom += (hudZoomTarget - hudZoom) * 0.07;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  ctx.scale(hudZoom, hudZoom);
  ctx.translate(-W / 2, -H / 2);

  // === Hold Notes vencidas ===
  for (let i = 0; i < 4; i++) {
if (lanesHeld[i].held && lanesHeld[i].holdNote) {
  const note = lanesHeld[i].holdNote;
  if (songPos > note.time + note.sustain + 100) {
    const idx = bfNotes.indexOf(note);
    if (idx !== -1) bfNotes.splice(idx, 1);

    // ✅ Registrar como acierto
    score += 50;
    notesPassed++;
    addRatingSprite(30); // o puedes usar el diff real si quieres precisión

    // ✅ Restablecer el estado
    lanesHeld[i].held = false;
    lanesHeld[i].holdNote = null;
  }
}

  }

  // === Eliminar notas que se pasaron ===
for (let i = bfNotes.length - 1; i >= 0; i--) {
  let note = bfNotes[i];
  if (note.hit) continue; // Ya fue presionada

  const isHold = note.sustain > 0;

  if (!isHold && songPos > note.time + hitWindow) {
    // Nota normal que se pasó
    bfNotes.splice(i, 1);
    misses++;
    playerHealth -= 0.5;
  }

if (isHold && songPos > note.time + note.sustain + 200) {
  // Si NO está siendo sostenida
  const laneIdx = note.lane - 4;
  const isBeingHeld = lanesHeld[laneIdx]?.holdNote === note;

  if (!isBeingHeld) {
    bfNotes.splice(i, 1);
    misses++;
    playerHealth -= 0.5;
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

    renderStrums(dadReceptorY, strumSize, startX_opp, strumSpacing, laneStates, false);
    renderNotes(dadNotes, false, startX_opp, strumSpacing, strumSize, holdWidth, dadReceptorY, songPos, true);

    renderStrums(bfReceptorY, strumSize, startX_player, strumSpacing, laneStates, true);
    renderNotes(bfNotes, true, startX_player, strumSpacing, strumSize, holdWidth, bfReceptorY, songPos, true);

      for (const name in window.luaSprites) {
    const s = window.luaSprites[name];
    if (s.visible && s.img.complete) {
      ctx.drawImage(s.img, s.x, s.y, s.width, s.height);
    }
  }
    // === Ratings ===
    for (let i = ratingSprites.length - 1; i >= 0; i--) {
      let s = ratingSprites[i];
      s.y += s.vy;
      s.x += s.vx;
      s.alpha -= 0.02;
      if (s.alpha <= 0) {
        ratingSprites.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = s.alpha;
      ctx.drawImage(s.img, s.x, s.y, 100, 50);
      ctx.globalAlpha = 1;
    }

    // === Texto HUD ===
    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Sick:${ratingsCount.sick} Good:${ratingsCount.good} Bad:${ratingsCount.bad} Shit:${ratingsCount.shit} Miss:${misses}`, 10, 55);
    ctx.fillText(`${notesPassed}/${totalNotes}`, 10, 80);
  }

  // === Barra de vida e íconos ===
  healthBar.update();
  healthBar.drawTo(ctx);
  drawProgressBar();

let healthPercent = playerMaxHealth > 0 ? playerHealth / playerMaxHealth : 0.5;

// Aseguramos que esté entre 0 y 1
if (!isFinite(healthPercent) || isNaN(healthPercent)) healthPercent = 0.5;
healthPercent = Math.max(0, Math.min(1, healthPercent));

  //console.log("🧪 Salud:", playerHealth, "/", playerMaxHealth, "=>", healthPercent);

const iconOffset = 300 * healthPercent;

  //console.log("📦 iconOffset =", iconOffset, "P1 X =", iconP1.x, "P2 X =", iconP2.x);

  // Actualiza íconos
if (iconP1 && iconP2) {

  const iconW = iconP1.width || 75;
  const iconH = iconP1.height || 75;

  updateHealthIcons();

  // Dibujar con HUD Zoom y Flip para P2
  ctx.save();
  ctx.translate(iconP1.x + iconW / 2, iconP1.y + iconH / 2);
  ctx.scale(hudZoom, hudZoom);
  ctx.translate(-iconW / 2, -iconH / 2);
  iconP1.draw(ctx, healthPercent, true);
  ctx.restore();

  ctx.save();
  ctx.translate(iconP2.x + iconW / 2, iconP2.y + iconH / 2);
  ctx.scale(-hudZoom, hudZoom); // flip horizontal
  ctx.translate(-iconW / 2, -iconH / 2);
  iconP2.draw(ctx, healthPercent, false);
  ctx.restore();
}

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

  const clampX = (x) => Math.max(barX - iconW / 2, Math.min(x, barX + barW - iconW / 2));

  const p1X = clampX(barX + (1 - healthPercent) * barW - iconW / 2);
  const p2X = clampX(barX + healthPercent * barW - iconW / 2);

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
function renderStrums(y, size, startX, spacing, laneStates, isPlayer) {
  for (let i = 0; i < 4; i++) {
    let dir = laneDirs[i];
    let x = startX + i * spacing;
    let state = laneStates[i];
    let frame;

    if (isPlayer) {
      // Animaciones de press/confirm para player
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
        // Idle del player debe usar siempre el sprite colorido
        frame = NotesAssets.framesMap?.[i];
      }
    } else {
      // Oponente: solo gris (framesMap)
      frame = NotesAssets.framesMap?.[i];
    }

    if (!frame) continue;

    let fx = parseInt(frame.getAttribute("x"));
    let fy = parseInt(frame.getAttribute("y"));
    let fw = parseInt(frame.getAttribute("width"));
    let fh = parseInt(frame.getAttribute("height"));

    ctx.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x, y, size, size);

    // Actualizar animación solo si es player
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
    boyfriend.update();
    boyfriend.draw(ctx);
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

    ctx.drawImage(
      NotesAssets.notesImage,
      px, py, pw, ph,
      x + (size - holdWidth) / 2, bodyY,
      holdWidth, bodyHeight
    );
  }

    const yEndHold = calculateNoteY({ time: holdVisibleStartTime }, songPos, receptorY, upwards);
    const yEndEnd = calculateNoteY({ time: sustainEndTime }, songPos, receptorY, upwards);

  // ✅ Ahora, antes de dibujar el end, verificamos si ya pasó el tiempo
  if (songPos >= note.time && songPos <= note.time + note.sustain) {
    const end = NotesAssets.holdEnds[laneIndex];
    if (end) {
      const ex = +end.getAttribute("x");
      const ey = +end.getAttribute("y");
      const ew = +end.getAttribute("width");
      const eh = +end.getAttribute("height");
      ctx.drawImage(
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
        ctx.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x, yStart, size, size);
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
    // Ya no restes 4: compara directamente con lane + 4
    if (note.lane !== lane + 4) continue;

    const diff = Math.abs(note.time - songPos);
    if (diff <= hitWindow) {
      if (note.sustain > 0) {
        lanesHeld[lane].holdNote = note;
         note.hit = true;
      } else {
        bfNotes.splice(i, 1);
        score += 100;
        addRatingSprite(diff);
        notesPassed++;

        // 🔼 SUBIR VIDA AL ACERTAR
        playerHealth += 1.5;
        if (playerHealth > playerMaxHealth) playerHealth = playerMaxHealth;

        if (hitSound) {
          hitSound.currentTime = 0;
          hitSound.play();
        }
      }
      return;
    }
  }

  // No acertaste ninguna nota
  misses++;
  playerHealth -= 0.5;
}

// Carga de imagenes, sprites y ratings aquí...
// (asume que ya está hecho)

loadMenu();
requestAnimationFrame(loop);