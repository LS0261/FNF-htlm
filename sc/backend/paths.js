const Paths = {
  // Archivos de canciones
  songInst: (name) => `songs/${name}/Inst.ogg`,
  songVoices: (name) => `songs/${name}/Voices.ogg`,
  songJSON: (name) => `data/songs/${name}/${name}.json`,

  // Stages y weeks
  stageJSON: (name) => `data/stages/${name}.json`,
  weekList: () => `data/weeks/weekList.json`,

  // Imagen genérica (por nombre, sin carpeta extra)
  image: (name) => `images/${name}.png`,

  // Imagen dentro de una carpeta (útil si organizas por subcarpetas)
  imageFrom: (folder, name) => `images/${folder}/${name}.png`,

  // Sonidos genéricos
  sound: (name) => `sounds/${name}.ogg`,

  // Datos genéricos tipo JSON o XML
  json: (path) => `data/${path}.json`,
  xml: (path) => `data/${path}.xml`,

  // Archivos estáticos en la raíz o directorio base
  file: (path) => `${path}`,

  // Por ejemplo: notas tipo TextureAtlas
  textureAtlas: (name) => `images/${name}.xml`,
};

export default Paths;
