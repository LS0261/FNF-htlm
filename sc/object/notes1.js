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

let framesMap = {}, framesMapColored = {};
let bfNotes = [];
let imageLoaded = false, framesLoaded = false, jsonLoaded = false;
let notesPassed = 0, totalNotes = 0;

let scrollDuration = 3000; // rápido
let anticipationMs = -200; // sincroniza

const notesImage = new Image();
notesImage.src = "images/NOTE_assets.png";
notesImage.onload = () => { imageLoaded = true; };

// ratings
const ratings = {
  sick: new Image(),
  good: new Image(),
  bad: new Image(),
  shit: new Image()
};
ratings.sick.src = "images/sick.png";
ratings.good.src = "images/good.png";
ratings.bad.src = "images/bad.png";
ratings.shit.src = "images/shit.png";

let ratingSprites = [];

fetch("images/NOTE_assets.xml")
.then(res => res.text())
.then(xmlText => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  framesMap[0] = xml.querySelector('SubTexture[name="arrowLEFT0000"]');
  framesMap[1] = xml.querySelector('SubTexture[name="arrowDOWN0000"]');
  framesMap[2] = xml.querySelector('SubTexture[name="arrowUP0000"]');
  framesMap[3] = xml.querySelector('SubTexture[name="arrowRIGHT0000"]');
  framesMapColored[0] = xml.querySelector('SubTexture[name="purple0000"]');
  framesMapColored[1] = xml.querySelector('SubTexture[name="blue0000"]');
  framesMapColored[2] = xml.querySelector('SubTexture[name="green0000"]');
  framesMapColored[3] = xml.querySelector('SubTexture[name="red0000"]');
  framesLoaded = true;
  loadMenu();
});

function loadMenu() {
  fetch("data/")
    .then(res => res.text())
    .then(html => {
      let songDirs = [...html.matchAll(/href="([^"]+)\/"/g)]
        .map(m => m[1])
        .filter(name => name !== "..");
      menuDiv.innerHTML = "<h2>Selecciona una canción:</h2>";
      songDirs.forEach(song => {
        const btn = document.createElement("button");
        btn.textContent = song;
        btn.onclick = () => loadSong(song);
        menuDiv.appendChild(btn);
      });
    });
}

let audioInst;
let playing = false;
let hitSound = new Audio("hitsound.ogg");
hitSound.volume = 0.5;

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

function loadSong(songName) {
  menuDiv.style.display = "none";
  canvas.style.display = "block";

  bfNotes = [];
  notesPassed = 0;
  totalNotes = 0;
  playing = false;
  jsonLoaded = false;
  ratingSprites = [];

  let instPath = `songs/${songName}/Inst.ogg`;
  audioInst = new Audio(instPath);
  audioInst.volume = 0.5;

  fetch(`data/${songName}/${songName}.json`)
    .then(res => res.json())
    .then(json => {
      let speed = json.song.speed || 1;
      scrollDuration = 3000 / speed;
      json.song.notes.forEach(section => {
        section.sectionNotes.forEach(note => {
          if (note[1] >= 0 && note[1] <= 3) {
            bfNotes.push({
              time: note[0] + anticipationMs,
              lane: note[1],
              sustain: note[2],
              hit: false
            });
          }
        });
      });
      totalNotes = bfNotes.length;
      jsonLoaded = true;
      playBtn.style.display = "block";
    })
    .catch(err => {
      alert("No se encontró el JSON para " + songName);
      menuDiv.style.display = "block";
      canvas.style.display = "none";
    });
}

canvas.addEventListener("click", handleInput);
canvas.addEventListener("touchstart", e => {
  handleInput(e.touches[0]);
  e.preventDefault();
}, {passive:false});

function handleInput(e) {
  let xPos = e.clientX;
  let spacing = W / 4;
  let startX = (W - spacing * 4) / 2;

  for (let lane = 0; lane < 4; lane++) {
    let laneX = startX + lane * spacing;
    if (xPos >= laneX && xPos <= laneX + spacing) {
      for (let i = 0; i < bfNotes.length; i++) {
        let note = bfNotes[i];
        if (note.lane === lane && !note.hit) {
          let songPos = audioInst ? audioInst.currentTime * 1000 : 0;
          let noteY = calculateNoteY(note, songPos);
          let diff = Math.abs(note.time - songPos);
          if (Math.abs(noteY - (H - 400)) < 80) { // receptor a H - 400
            let rate;
            if (diff < 50) rate = "sick";
            else if (diff < 100) rate = "good";
            else if (diff < 200) rate = "bad";
            else rate = "shit";
            addRatingSprite(rate);
            note.hit = true;
            bfNotes.splice(i, 1);
            hitSound.currentTime = 0;
            hitSound.play();
            notesPassed++;
            break;
          }
        }
      }
      break;
    }
  }
}

function addRatingSprite(type) {
  ratingSprites.push({
    img: ratings[type],
    x: W/2 + (Math.random()*40-20),
    y: H/2,
    alpha: 1,
    vy: -1,
    vx: Math.random()*2 -1
  });
}

function calculateNoteY(note, songPos) {
  let travelDistance = H - 400 - 50; // receptor más arriba
  let timeToHit = note.time - songPos;
  let speed = travelDistance / scrollDuration;
  return H - 400 - timeToHit * speed; 
}

function loop() {
  ctx.clearRect(0, 0, W, H);
  if (imageLoaded && framesLoaded && jsonLoaded) {
    let spacing = W / 4;
    let size = spacing * 0.8;
    let startX = (W - spacing * 4) / 2;
    let receptorY = H - 400; // receptor Y más arriba

    for (let i = 0; i < 4; i++) {
      let frame = framesMap[i];
      if (!frame) continue;
      let fx = parseInt(frame.getAttribute("x"));
      let fy = parseInt(frame.getAttribute("y"));
      let fw = parseInt(frame.getAttribute("width"));
      let fh = parseInt(frame.getAttribute("height"));
      let x = startX + i * spacing;
      ctx.drawImage(notesImage, fx, fy, fw, fh, x, receptorY, size, size);
    }

    if (playing) {
      let songPos = audioInst ? audioInst.currentTime * 1000 : 0;
      for (let i = bfNotes.length - 1; i >= 0; i--) {
        let note = bfNotes[i];
        let y = calculateNoteY(note, songPos);
        if (y > H) {
          bfNotes.splice(i, 1);
          continue;
        }
        if (y > -size) {
          let frame = framesMapColored[note.lane];
          let fx = parseInt(frame.getAttribute("x"));
          let fy = parseInt(frame.getAttribute("y"));
          let fw = parseInt(frame.getAttribute("width"));
          let fh = parseInt(frame.getAttribute("height"));
          let x = startX + note.lane * spacing;
          ctx.drawImage(notesImage, fx, fy, fw, fh, x, y, size, size);
        }
      }
    }

    for (let i = ratingSprites.length -1; i >= 0; i--) {
      let s = ratingSprites[i];
      s.y += s.vy;
      s.x += s.vx;
      s.alpha -= 0.02;
      if (s.alpha <= 0) {
        ratingSprites.splice(i,1);
        continue;
      }
      ctx.globalAlpha = s.alpha;
      ctx.drawImage(s.img, s.x, s.y, 100, 50);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#fff";
    ctx.font = "20px Arial";
    ctx.fillText(`${notesPassed}/${totalNotes}`, 10, 30);
  }
  requestAnimationFrame(loop);
}
loop();