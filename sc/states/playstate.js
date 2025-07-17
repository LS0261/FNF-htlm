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

let bfNotes = [];
let dadNotes = [];
let notesPassed = 0, totalNotes = 0;
let scrollDuration = 3000;
let anticipationMs = -200;

let audioInst;
let playing = false;
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

let bfReceptorY = H - 400;
let dadReceptorY = 100;
let baseDistance = Math.abs(bfReceptorY - 50);

let lanesHeld = [false, false, false, false];

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

function startPlay(songName) {
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
      let speed = json.song.speed || 1;
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
}

// INPUT con lanesHeld
canvas.addEventListener("mousedown", e => handleMouseTouch(e.clientX));
canvas.addEventListener("mousemove", e => { if (e.buttons) handleMouseTouch(e.clientX); });
canvas.addEventListener("mouseup", () => lanesHeld = [false, false, false, false]);

canvas.addEventListener("touchstart", e => {
  handleTouches(e.touches);
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  handleTouches(e.touches);
  e.preventDefault();
}, { passive: false });

canvas.addEventListener("touchend", () => lanesHeld = [false, false, false, false], { passive: false });

function handleMouseTouch(x) {
  let spacing = W / 4;
  let startX = (W - spacing * 4) / 2;
  let lane = Math.floor((x - startX) / spacing);
  if (lane >= 0 && lane < 4) {
    if (!lanesHeld[lane]) {
      tryHitLane(lane, getSongPos(), bfReceptorY);
      lanesHeld[lane] = true;
    }
  }
}

function handleTouches(touches) {
  let spacing = W / 4;
  let startX = (W - spacing * 4) / 2;
  let lanesThisTouch = [false, false, false, false];

  for (let t of touches) {
    let lane = Math.floor((t.clientX - startX) / spacing);
    if (lane >= 0 && lane < 4) {
      if (!lanesHeld[lane]) {
        tryHitLane(lane, getSongPos(), bfReceptorY);
      }
      lanesThisTouch[lane] = true;
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
  let speed = baseDistance / scrollDuration;
  return upwards
    ? receptorY + (note.time - songPos) * speed
    : receptorY - (note.time - songPos) * speed;
}

// Variables para HUD zoom + metronome
let hudZoom = 1;
let hudZoomTarget = 1;
let beatLength = 60000 / 120; // ms por beat
let lastBeatTime = 0;
let beatCount = 0;

let metronome1 = new Audio("sounds/metronome1.ogg");
let metronome2 = new Audio("sounds/metronome2.ogg");

function loop() {
  requestAnimationFrame(loop);

  if (!playing) return; // Pausar loop si no está playing

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

  // Detección beat con tolerancia
  if ((songPos - lastBeatTime) >= (currentBeatLength - 5)) {
    beatCount = (beatCount + 1) % 4;

    if (beatCount === 0) {
      hudZoom = 1.1;
      metronome1.currentTime = 0;
      //metronome1.play();
    } else {
      hudZoom = 1.05;
      metronome2.currentTime = 0;
      //ametronome2.play();
    }

    hudZoomTarget = 1;
    lastBeatTime += currentBeatLength;

    // Para evitar que lastBeatTime se quede muy atrasado (en caso de saltos)
    if (songPos - lastBeatTime > currentBeatLength) {
      lastBeatTime = songPos;
    }
  }

  // Suavizar zoom hacia 1
  hudZoom += (hudZoomTarget - hudZoom) * 0.1;

  // Reset transform y limpiar
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Aplicar zoom HUD
  ctx.translate(W / 2, H / 2);
  ctx.scale(hudZoom, hudZoom);
  ctx.translate(-W / 2, -H / 2);

  if (NotesAssets.imageLoaded && NotesAssets.framesLoaded) {
    // Por esto:
    let strumSpacing = Math.min(W * 0.08, 100);   // separación entre lanes (máx 100px)
    let strumSize = strumSpacing * 0.9;           // tamaño de cada strum
    let holdWidth = strumSize * 0.4;

    // Posiciones separadas:
    let startX_opp = W * 0.1;                      // oponente izquierda (10% ancho)
    let startX_player = W - (strumSpacing * 4) - W * 0.1;  // player derecha (10% desde derecha)4) / 2;

    // Oponente - izquierda
    renderStrums(dadReceptorY, strumSize, startX_opp, strumSpacing, laneStates, false);
    renderNotes(dadNotes, false, startX_opp, strumSpacing, strumSize, holdWidth, dadReceptorY, songPos, true);

    // Player - derecha
    renderNotes(bfNotes, true, startX_player, strumSpacing, strumSize, holdWidth, bfReceptorY, songPos, false);
    renderStrums(bfReceptorY, strumSize, startX_player, strumSpacing, laneStates, true);

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
}

function renderNotes(notes, isPlayer, startX, spacing, size, holdWidth, receptorY, songPos, upwards) {
  for (let i = notes.length - 1; i >= 0; i--) {
    let note = notes[i];
    let lane = isPlayer ? note.lane - 4 : note.lane;
    let yStart = calculateNoteY(note, songPos, receptorY, upwards);
    let x = startX + lane * spacing;

    // Saltar si ya pasó y no es sustain
    if (note.time + scrollDuration < songPos && !note.sustain) {
      notes.splice(i, 1);
      notesPassed++;
      misses++;
      continue;
    }

    // Dibujar sustain
    if (note.sustain > 0) {
      let sustainEndTime = note.time + note.sustain;
      let yEnd = calculateNoteY({ time: sustainEndTime }, songPos, receptorY, upwards);
      let height = Math.abs(yEnd - yStart);

      ctx.fillStyle = isPlayer ? "rgba(0,255,0,0.7)" : "rgba(255,0,0,0.7)";
      ctx.fillRect(x + (size - holdWidth) / 2, Math.min(yStart, yEnd), holdWidth, height);
    }

    // Dibujar nota principal
    if (note.time >= songPos - scrollDuration) {
      let laneIndex = lane % 4;
      if (laneIndex < 0) laneIndex += 4;

      // 🔁 Asegurar que siempre se use framesMapColored
      let frame = NotesAssets.framesMapColored[laneIndex];
      if (frame) {
        let fx = parseInt(frame.getAttribute("x"));
        let fy = parseInt(frame.getAttribute("y"));
        let fw = parseInt(frame.getAttribute("width"));
        let fh = parseInt(frame.getAttribute("height"));
        ctx.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x, yStart, size, size);
      }
    }
    if (!isPlayer) {
      if (songPos >= note.time) {
        notes.splice(i, 1); // Nota desaparece justo al llegar el tiempo 
        notesPassed++;
      }
    }
  }
}

function tryHitLane(lane, songPos, receptorY) {
  let notesArray = bfNotes;
  let targetLane = lane;

  // Evitar tocar las notas del oponente
  if (lane < 4) return;

  targetLane = lane - 4;

  // Buscar nota más cercana
  let closestNoteIndex = -1;
  let closestDiff = Infinity;

  for (let i = 0; i < notesArray.length; i++) {
    let note = notesArray[i];
    if (note.lane !== lane) continue;

    let diff = Math.abs(note.time - songPos);
    if (diff < 200 && diff < closestDiff) {
      closestNoteIndex = i;
      closestDiff = diff;
    }
  }

  if (closestNoteIndex !== -1) {
    let note = notesArray[closestNoteIndex];
    notesArray.splice(closestNoteIndex, 1);
    notesPassed++;
    addRatingSprite(closestDiff);
    score += 10;
    laneStates[targetLane].state = "confirm";
    laneStates[targetLane].timer = 10;
  } else {
    misses++;
    laneStates[targetLane].state = "press";
    laneStates[targetLane].timer = 10;
  }
}

// Carga de imagenes, sprites y ratings aquí...
// (asume que ya está hecho)

loadMenu();
loop();
