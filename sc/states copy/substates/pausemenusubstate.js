window.openPauseMenu = function(audioInst, onResume) {
  const pauseOverlay = document.createElement("div");
  pauseOverlay.style.position = "fixed";
  pauseOverlay.style.top = 0;
  pauseOverlay.style.left = 0;
  pauseOverlay.style.width = "100%";
  pauseOverlay.style.height = "100%";
  pauseOverlay.style.background = "rgba(0, 0, 0, 0.7)";
  pauseOverlay.style.display = "flex";
  pauseOverlay.style.flexDirection = "column";
  pauseOverlay.style.justifyContent = "center";
  pauseOverlay.style.alignItems = "center";
  pauseOverlay.style.zIndex = 9999;
  pauseOverlay.style.color = "#fff";
  pauseOverlay.style.fontFamily = "sans-serif";

  const title = document.createElement("h2");
  title.textContent = "PAUSED";
  pauseOverlay.appendChild(title);

  const resumeBtn = document.createElement("button");
  resumeBtn.textContent = "RESUME";
  resumeBtn.style.fontSize = "24px";
  resumeBtn.style.margin = "10px";
  pauseOverlay.appendChild(resumeBtn);

  document.body.appendChild(pauseOverlay);

  audioInst.pause();

  resumeBtn.onclick = () => {
    document.body.removeChild(pauseOverlay);
    audioInst.play();
    onResume();
  };
}