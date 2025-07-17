import { Character } from "../object/character.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const menuDiv = document.getElementById("menu");

let W = window.innerWidth;
let H = window.innerHeight;
canvas.width = W;
canvas.height = H;

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
});

let fixedSpeed = 1.0;
let bpmSections = [];

let bfNotes = [];
let dadNotes = [];
let notesPassed = 0, totalNotes = 0;
let scrollDuration = 3000;
let anticipationMs = -200;
let lastTimestamp = 0;
let audioInst;
let playing = false;

let bf = null;
let gf = null;
let dad = null;

const keyToLane = {
  "ArrowLeft": 0,
  "ArrowDown": 1,
  "ArrowUp": 2,
  "ArrowRight": 3
};

const lanesHeld = [
  { held: false, holdNote: null },
  { held: false, holdNote: null },
  { held: false, holdNote: null },
  { held: false, holdNote: null }
];

let hitSound = new Audio("hitsound.ogg");
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

  bf = await new Character('bf', 300, 100, 'BF');
  
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

  let instPath = `songs/${songName}/Inst.ogg`;
  audioInst = new Audio(instPath);
  audioInst.volume = 0.5;

audioInst.onended = () => {
  playing = false;
  pauseBtn.style.display = "none";
  canvas.style.display = "none";
  menuDiv.style.display = "block";
  playBtn.style.display = "none";

  // Limpiar arrays para evitar bugs
  bfNotes = [];
  dadNotes = [];
  notesPassed = 0;
  totalNotes = 0;

  // Opcional: resetear score, estados, etc si quieres
};

  fetch(`data/${songName}/${songName}.json`)
    .then(res => res.json())
    .then(json => {
      let speed = json.song.speed || 1;  // Declara aquí speed
      let speedMultiplier = json.song.speed || 1;
      fixedSpeed = speedMultiplier * 0.25; // ejemplo: 0.1 px/ms base

      scrollDuration = 2000 / speed;
      baseDistance = Math.abs(bfReceptorY - 30);

      let bpm = json.song.bpm || 120;
      beatLength = 60000 / bpm;

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

      // Inicializar lastBeatTime para evitar loop infinito
      lastBeatTime = 0;
      beatCount = 0;

      playBtn.style.display = "block";
    });
    lastTimestamp = performance.now();
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
        addRatingSprite(30);
      } else {
        misses++;
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
      if (heldNote && getSongPos() < heldNote.time + heldNote.sustain) {
        const idx = bfNotes.indexOf(heldNote);
        if (idx !== -1) bfNotes.splice(idx, 1);
        misses++;
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
      tryHitLane(lane + 4, getSongPos(), bfReceptorY);
      lanesHeld[lane].held = true;
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
        tryHitLane(lane + 4, getSongPos(), bfReceptorY);
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
  let type = diff < 50 ? "sick" : diff < 100 ? "good" : diff < 200 ? "bad" : "shit";
  ratingsCount[type]++;
  if (type === "sick") score += 350;
  else if (type === "good") score += 200;
  else if (type === "bad") score += 100;
  else score += 50;

  ratingSprites.push({
    img: NotesAssets.ratingsImages[type],
    x: W / 2 + (Math.random() * 40 - 20),
    y: H / 2,
    alpha: 1,
    vy: -1,
    vx: Math.random() * 2 - 1
  });
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

let metronome1 = new Audio("sounds/metronome1.ogg");
let metronome2 = new Audio("sounds/metronome2.ogg");

function loop(timestamp) {

  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  requestAnimationFrame(loop);
  if (!playing) return;


  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  if (bf && bf.update) bf.update(delta);

  if (bf && bf.draw) bf.draw(ctx);

  let songPos = getSongPos();

  // BPM dinámico
  let currentBpm = bpmSections[0].bpm;
  let currentBeatLength = 60000 / currentBpm;

  for (let i = 0; i < bpmSections.length; i++) {
    if (songPos >= bpmSections[i].time) {
      currentBpm = bpmSections[i].bpm;
      currentBeatLength = 60000 / currentBpm;
    } else {
      break;
    }
  }

  if ((songPos - lastBeatTime) >= (currentBeatLength - 5)) {
    beatCount = (beatCount + 1) % 4;
    if (beatCount === 0) {
      hudZoom = 1.1;
      metronome1.currentTime = 0;
    } else {
      hudZoom = 1.05;
      metronome2.currentTime = 0;
    }
    hudZoomTarget = 1;
    lastBeatTime += currentBeatLength;
    if (songPos - lastBeatTime > currentBeatLength) {
      lastBeatTime = songPos;
    }
    if (bf && bf.dance) bf.dance();
  }

  hudZoom += (hudZoomTarget - hudZoom) * 0.1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2);
  ctx.scale(hudZoom, hudZoom);
  ctx.translate(-W / 2, -H / 2);

  // 🔄 Hold activo
  for (let i = 0; i < 4; i++) {
    if (lanesHeld[i].held && lanesHeld[i].holdNote) {
      const note = lanesHeld[i].holdNote;
      if (songPos > note.time + note.sustain + 100) {
        misses++;
        let idx = bfNotes.indexOf(note);
        if (idx !== -1) bfNotes.splice(idx, 1);
        lanesHeld[i].held = false;
        lanesHeld[i].holdNote = null;
      }
    }
  }

  // ❌ Eliminar notas no tocadas a tiempo
  for (let i = bfNotes.length - 1; i >= 0; i--) {
    let note = bfNotes[i];
    if (!note.hit && songPos > note.time + note.sustain + 200) {
      bfNotes.splice(i, 1);
      misses++;
    }
  }

  if (NotesAssets.imageLoaded && NotesAssets.framesLoaded) {
    let strumSpacing = Math.min(W * 0.08, 100);
    let strumSize = strumSpacing * 1;
    let holdWidth = strumSize * 0.4;
    let startX_opp = W * 0.1;
    let startX_player = W - (strumSpacing * 4) - W * 0.1;

    renderStrums(dadReceptorY, strumSize, startX_opp, strumSpacing, laneStates, false);
    renderNotes(dadNotes, false, startX_opp, strumSpacing, strumSize, holdWidth, dadReceptorY, songPos, true);

    renderStrums(bfReceptorY, strumSize, startX_player, strumSpacing, laneStates, true);
    renderNotes(bfNotes, true, startX_player, strumSpacing, strumSize, holdWidth, bfReceptorY, songPos, true);

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

    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Sick:${ratingsCount.sick} Good:${ratingsCount.good} Bad:${ratingsCount.bad} Shit:${ratingsCount.shit} Miss:${misses}`, 10, 55);
    ctx.fillText(`${notesPassed}/${totalNotes}`, 10, 80);
  }
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
  if (bf) {
    bf.update();
    bf.draw(ctx);
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

      // El hold visible empieza en el tiempo actual (o en note.time si aún no ha llegado)
      const holdVisibleStartTime = Math.max(note.time, songPos);
      const sustainEndTime = note.time + note.sustain;

      const yStartHold = calculateNoteY({ time: holdVisibleStartTime }, songPos, receptorY, upwards);
      const yEnd = calculateNoteY({ time: sustainEndTime }, songPos, receptorY, upwards);

      const bodyHeight = Math.abs(yEnd - yStartHold);
      const bodyY = Math.min(yStartHold, yEnd) + size / 2;

      // === Dibujar el cuerpo del hold (repetir pieza verticalmente) ===
      const piece = NotesAssets.holdPieces[laneIndex];
      if (piece) {
        const px = +piece.getAttribute("x");
        const py = +piece.getAttribute("y");
        const pw = +piece.getAttribute("width");
        const ph = +piece.getAttribute("height");

        const drawHeight = bodyHeight - size;
        let drawn = 0;
        while (drawn < drawHeight) {
          const h = Math.min(ph, drawHeight - drawn);
          ctx.drawImage(
            NotesAssets.notesImage,
            px, py, pw, h,
            x + (size - holdWidth) / 2, bodyY + drawn,
            holdWidth, h
          );
          drawn += h;
        }
      }

      // === Dibujar la parte final ===
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

    // === Cabeza de la nota ===
    if (note.time >= songPos - scrollDuration) {
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
    if (note.lane - 4 !== lane) continue;

    const diff = Math.abs(note.time - songPos);
    if (diff <= hitWindow) {
      if (note.sustain > 0) {
        lanesHeld[lane].holdNote = note;
      } else {
        bfNotes.splice(i, 1);
        score += 100;
        addRatingSprite();
        notesPassed++;
      }
      return;
    }
  }

  // No acertaste ninguna nota
  misses++;
}

// Carga de imagenes, sprites y ratings aquí...
// (asume que ya está hecho)

loadMenu();
requestAnimationFrame(loop);