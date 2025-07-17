let bpm = 120;
let bpmChanges = [];
let lastProcessedBeat = -1;
let song = document.getElementById("song");
let cover = document.getElementById("cover");
let currentBPMDisplay = document.getElementById("currentBPM");
let allBPMsDisplay = document.getElementById("allBPMs");
let beatIndicator = document.querySelector(".beat-indicator");
let animating = false;

// Setup anillo pequeño
let circle = document.querySelector(".progress-ring__circle");
let radius = circle.r.baseVal.value;
let circumference = 2 * Math.PI * radius;
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

function setProgress(percent) {
  const offset = circumference - percent * circumference;
  circle.style.strokeDashoffset = offset;
}

// Leer data.json
fetch("data.json")
  .then(res => res.json())
  .then(data => {
    let songData = data.song;
    bpm = songData.bpm;
    let time = 0;
    let uniqueBPMs = new Set();

    for (let section of songData.notes) {
      let sectionBPM = section.bpm || bpm;
      bpmChanges.push({
        startTime: time,
        bpm: sectionBPM
      });
      uniqueBPMs.add(sectionBPM);
      time += (60 / sectionBPM) * section.sectionBeats;
    }

    allBPMsDisplay.textContent = Array.from(uniqueBPMs).join(", ");
  });

function getBPMAndOffset(currentTime) {
  let bpmUsed = bpm;
  let timeAtLastChange = 0;

  for (let change of bpmChanges) {
    if (currentTime >= change.startTime) {
      bpmUsed = change.bpm;
      timeAtLastChange = change.startTime;
    } else {
      break;
    }
  }

  return {
    bpm: bpmUsed,
    offset: timeAtLastChange
  };
}

function animate() {
  if (!song.paused) {
    let currentTime = song.currentTime;
    let duration = song.duration || 1; 
    let progressPercent = currentTime / duration;
    setProgress(progressPercent);

    let { bpm: currentBPM, offset } = getBPMAndOffset(currentTime);
    currentBPMDisplay.textContent = currentBPM;

    let beatDuration = 60 / currentBPM;
    let localTime = currentTime - offset;
    let totalBeats = localTime / beatDuration;

    let beat = Math.floor(totalBeats / 2);
    if (beat > lastProcessedBeat) {
      doZoomEffect();
      lastProcessedBeat = beat;
    }

    let progressInCycle = (totalBeats % 2) / 2;
    let barWidth = document.querySelector(".beat-bar").offsetWidth;
    beatIndicator.style.left = `${progressInCycle * barWidth}px`;
  }

  requestAnimationFrame(animate);
}

function doZoomEffect() {
  cover.style.transition = "transform 0s";
  cover.style.transform = "scale(1.15)";
  setTimeout(() => {
    cover.style.transition = "transform 0.5s";
    cover.style.transform = "scale(1)";
  }, 20);
}

song.onplay = () => {
  if (!animating) {
    animating = true;
    lastProcessedBeat = -1;
    requestAnimationFrame(animate);
  }
};