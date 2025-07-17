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

/// Parseo de XML para obtener frames
fetch("images/NOTE_assets.xml")
  .then(res => res.text())
  .then(xmlText => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");
    NotesAssets.framesMap[0] = xml.querySelector('SubTexture[name="arrowLEFT0000"]');
    NotesAssets.framesMap[1] = xml.querySelector('SubTexture[name="arrowDOWN0000"]');
    NotesAssets.framesMap[2] = xml.querySelector('SubTexture[name="arrowUP0000"]');
    NotesAssets.framesMap[3] = xml.querySelector('SubTexture[name="arrowRIGHT0000"]');
    NotesAssets.framesMapColored[0] = xml.querySelector('SubTexture[name="purple0000"]');
    NotesAssets.framesMapColored[1] = xml.querySelector('SubTexture[name="blue0000"]');
    NotesAssets.framesMapColored[2] = xml.querySelector('SubTexture[name="green0000"]');
    NotesAssets.framesMapColored[3] = xml.querySelector('SubTexture[name="red0000"]');
    NotesAssets.framesLoaded = true;
  });
