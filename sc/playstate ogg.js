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
let baseDistance = Math.abs(H - 400 - 50);

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
pauseBtn.style.display = "none"; // solo visible en el PlayState
document.body.appendChild(pauseBtn);
pauseBtn.onclick = () => {
  openPauseMenu(audioInst, () => { playing = true; });
};

function loadMenu() {
  let songDirs = ["no-escape", "deceiver-v4", "tal-vez-c"];
  menuDiv.innerHTML = "<h2>Selecciona una canción:</h2>";
  songDirs.forEach(song => {
    const btn = document.createElement("button");
    btn.textContent = song;
    btn.onclick = () => startSong(song);
    menuDiv.appendChild(btn);
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

  fetch(`data/${songName}/${songName}.json`)
    .then(res => res.json())
    .then(json => {
      let speed = json.song.speed || 1;
      scrollDuration = 3000 / speed;
      baseDistance = Math.abs(bfReceptorY - 50);

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

function loop() {
  ctx.clearRect(0, 0, W, H);

  if (NotesAssets.imageLoaded && NotesAssets.framesLoaded) {
    let spacing = W / 4;
    let size = spacing * 0.8;
    let holdWidth = size * 0.4;
    let startX = (W - spacing * 4) / 2;
    let songPos = getSongPos();

    renderStrums(dadReceptorY, size, startX, spacing, laneStates, false);
    renderNotes(dadNotes, false, startX, spacing, size, holdWidth, dadReceptorY, songPos, true);

    renderNotes(bfNotes, true, startX, spacing, size, holdWidth, bfReceptorY, songPos, false);
    renderStrums(bfReceptorY, size, startX, spacing, laneStates, true);

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

  requestAnimationFrame(loop);
}

function renderStrums(y, size, startX, spacing, laneStates, isPlayer) {
  for (let i = 0; i < 4; i++) {
    let dir = laneDirs[i];
    let x = startX + i * spacing;
    let state = laneStates[i];

    let frame;
    if (isPlayer && state.state === "confirm" && NotesAssets.animationsConfirm[dir].length) {
      frame = NotesAssets.animationsConfirm[dir][state.frameIdx % NotesAssets.animationsConfirm[dir].length];
    } else if (isPlayer && state.state === "press" && NotesAssets.animationsPress[dir].length) {
      frame = NotesAssets.animationsPress[dir][state.frameIdx % NotesAssets.animationsPress[dir].length];
    } else {
      frame = NotesAssets.framesMap[i];
    }

    if (!frame) continue;
    let fx = parseInt(frame.getAttribute("x"));
    let fy = parseInt(frame.getAttribute("y"));
    let fw = parseInt(frame.getAttribute("width"));
    let fh = parseInt(frame.getAttribute("height"));
    ctx.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x, y, size, size);

    if (isPlayer && state.timer > 0) {
      state.timer--;
      if (state.timer % 3 === 0) state.frameIdx++;
      if (state.timer === 0) { state.state = "idle"; state.frameIdx = 0; }
    }
  }
}

function renderNotes(notes, isPlayer, startX, spacing, size, holdWidth, receptorY, songPos, upwards) {
  for (let i = notes.length - 1; i >= 0; i--) {
    let note = notes[i];
    let lane = isPlayer ? note.lane - 4 : note.lane;
    let yStart = calculateNoteY(note, songPos, receptorY, upwards);
    let x = startX + lane * spacing + (size - holdWidth) / 2;

    if (!note.hit && isPlayer && yStart > receptorY + 100) {
      misses++;
      note.hit = true;
      bfNotes.splice(i, 1);
      continue;
    }

    let frame = NotesAssets.framesMapColored[note.lane % 4];
    if (frame && (yStart < H + size && yStart > -size)) {
      let fx = parseInt(frame.getAttribute("x"));
      let fy = parseInt(frame.getAttribute("y"));
      let fw = parseInt(frame.getAttribute("width"));
      let fh = parseInt(frame.getAttribute("height"));
      ctx.drawImage(NotesAssets.notesImage, fx, fy, fw, fh, x - (size - holdWidth)/2, yStart, size, size);
    }
  }
}

function tryHitLane(lane, songPos, receptorY) {
  let hit = false;
  for (let i = bfNotes.length - 1; i >= 0; i--) {
    let note = bfNotes[i];
    let laneMapped = note.lane - 4;
    let y = calculateNoteY(note, songPos, receptorY, false);
    let diff = Math.abs(y - receptorY);
    if (laneMapped === lane && !note.hit && diff < 70) {
      addRatingSprite(diff);
      note.hit = true;
      bfNotes.splice(i, 1);
      hitSound.currentTime = 0;
      hitSound.play();
      notesPassed++;
      hit = true;
      laneStates[lane] = { state: "confirm", timer: 15, frameIdx: 0 };
      break;
    }
  }
  if (!hit && laneStates[lane].state !== "confirm") {
    laneStates[lane] = { state: "press", timer: 10, frameIdx: 0 };
  }
}

loadMenu();
loop();