const bfImage = new Image();
bfImage.src = "images/characters/BOYFRIEND.png";

let bfFrames = {};
let bfLoaded = false;

fetch("images/characters/BOYFRIEND.xml")
.then(res => res.text())
.then(xmlText => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  bfFrames["idle"] = xml.querySelector('SubTexture[name="BF idle dance0"]');
  bfFrames["singLEFT"] = xml.querySelector('SubTexture[name="BF NOTE LEFT0"]');
  bfFrames["singDOWN"] = xml.querySelector('SubTexture[name="BF NOTE DOWN0"]');
  bfFrames["singUP"] = xml.querySelector('SubTexture[name="BF NOTE UP0"]');
  bfFrames["singRIGHT"] = xml.querySelector('SubTexture[name="BF NOTE RIGHT0"]');
  bfLoaded = true;
});

// Estado del character
let bfAnim = "idle";
let bfX = 600, bfY = 300;

function renderBF() {
  if (!bfLoaded) return;
  let frame = bfFrames[bfAnim];
  if (!frame) return;

  let fx = parseInt(frame.getAttribute("x"));
  let fy = parseInt(frame.getAttribute("y"));
  let fw = parseInt(frame.getAttribute("width"));
  let fh = parseInt(frame.getAttribute("height"));
  
  ctx.drawImage(bfImage, fx, fy, fw, fh, bfX, bfY, fw*2, fh*2);
}