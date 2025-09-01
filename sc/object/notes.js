const NotesAssets = {
  notesImage: new Image(),
  framesMap: {},
  framesMapColored: {},
  ratingsImages: {
    sick: new Image(),
    good: new Image(),
    bad: new Image(),
    shit: new Image()
  },
  animationsPress: {},      // ✅ Añadido
  animationsConfirm: {},    // ✅ Añadido
  imageLoaded: false,
  framesLoaded: false
};

// Carga de la imagen de notas
NotesAssets.notesImage.src = "images/NOTE_assets.png";
NotesAssets.notesImage.onload = () => {
  NotesAssets.imageLoaded = true;
};

// Carga de los ratings
NotesAssets.ratingsImages.sick.src = "images/sick.png";
NotesAssets.ratingsImages.good.src = "images/good.png";
NotesAssets.ratingsImages.bad.src = "images/bad.png";
NotesAssets.ratingsImages.shit.src = "images/shit.png";

// Función para obtener múltiples frames por prefijo (ej: "arrowLEFT press")
function getFramesByPrefix(xml, prefix) {
  const frames = [];
  const subTextures = xml.querySelectorAll("SubTexture");

  subTextures.forEach(sub => {
    const name = sub.getAttribute("name");
    if (name.startsWith(prefix)) {
      frames.push({
        x: parseInt(sub.getAttribute("x")),
        y: parseInt(sub.getAttribute("y")),
        w: parseInt(sub.getAttribute("width")),
        h: parseInt(sub.getAttribute("height")),
        name: name // lo guardamos solo para ordenar
      });
    }
  });

  // Ordenar por número final del nombre (ej: "arrowLEFT press0001")
  frames.sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+$/)?.[0] || "0");
    const numB = parseInt(b.name.match(/\d+$/)?.[0] || "0");
    return numA - numB;
  });

  return frames;
}

// Parseo del XML para obtener frames
fetch("images/NOTE_assets.xml")
  .then(res => res.text())
  .then(xmlText => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");

    // Flechas base (sin animación)
    NotesAssets.framesMap[0] = xml.querySelector('SubTexture[name="arrowLEFT0000"]');
    NotesAssets.framesMap[1] = xml.querySelector('SubTexture[name="arrowDOWN0000"]');
    NotesAssets.framesMap[2] = xml.querySelector('SubTexture[name="arrowUP0000"]');
    NotesAssets.framesMap[3] = xml.querySelector('SubTexture[name="arrowRIGHT0000"]');

    // Flechas coloreadas (activadas)
    NotesAssets.framesMapColored[0] = xml.querySelector('SubTexture[name="purple0000"]');
    NotesAssets.framesMapColored[1] = xml.querySelector('SubTexture[name="blue0000"]');
    NotesAssets.framesMapColored[2] = xml.querySelector('SubTexture[name="green0000"]');
    NotesAssets.framesMapColored[3] = xml.querySelector('SubTexture[name="red0000"]');

    // Piezas de notas sostenidas (hold)
    NotesAssets.holdPieces = {
      0: xml.querySelector('SubTexture[name="purple hold piece0000"]'),
      1: xml.querySelector('SubTexture[name="blue hold piece0000"]'),
      2: xml.querySelector('SubTexture[name="green hold piece0000"]'),
      3: xml.querySelector('SubTexture[name="red hold piece0000"]')
    };

    // Finales de notas sostenidas (hold ends)
    NotesAssets.holdEnds = {
      0: xml.querySelector('SubTexture[name="pruple end hold0000"]'), // <- typo en XML original
      1: xml.querySelector('SubTexture[name="blue hold end0000"]'),
      2: xml.querySelector('SubTexture[name="green hold end0000"]'),
      3: xml.querySelector('SubTexture[name="red hold end0000"]')
    };

    // Animaciones de "press"
    NotesAssets.animationsPress = {
      0: getFramesByPrefix(xml, "arrowLEFT press"),
      1: getFramesByPrefix(xml, "arrowDOWN press"),
      2: getFramesByPrefix(xml, "arrowUP press"),
      3: getFramesByPrefix(xml, "arrowRIGHT press")
    };

    // Animaciones de "confirm"
    NotesAssets.animationsConfirm = {
      0: getFramesByPrefix(xml, "purple confirm"),
      1: getFramesByPrefix(xml, "blue confirm"),
      2: getFramesByPrefix(xml, "green confirm"),
      3: getFramesByPrefix(xml, "red confirm")
    };

    NotesAssets.framesLoaded = true;
  });
