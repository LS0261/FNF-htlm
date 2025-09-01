import Paths from "../backend/Paths.js";

export class AnimationLoader {
  constructor(name) {
    this.name = name;
    this.logoAtlas = null;
    this.animation = null;
    this.image = new Image();
  }

  async load() {
    const atlasPath = Paths.textureAtlas(this.name);
    const imagePath = Paths.image(this.name);

    try {
      // Cargar el archivo XML (Atlas)
      const response = await fetch(atlasPath);
      const xmlText = await response.text();
      this.logoAtlas = this.parseXML(xmlText);

      // Cargar la imagen
      this.image.src = imagePath;
      await new Promise(resolve => { this.image.onload = resolve });

      console.log('Logo y Atlas cargados con éxito.');
    } catch (error) {
      console.error('Error al cargar el logo o el atlas:', error);
    }
  }

  // Parsear el XML para obtener las subtexturas
  parseXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const subTextures = xmlDoc.getElementsByTagName('SubTexture');
    const atlas = {};

    Array.from(subTextures).forEach(subTexture => {
      const name = subTexture.getAttribute('name');
      atlas[name] = {
        x: parseInt(subTexture.getAttribute('x')),
        y: parseInt(subTexture.getAttribute('y')),
        width: parseInt(subTexture.getAttribute('width')),
        height: parseInt(subTexture.getAttribute('height')),
      };
    });

    return atlas;
  }

  playAnimation(name, menuDiv) {
    const logoData = this.logoAtlas[name];

    if (!logoData) {
      console.error(`No se encontró la subtextura: ${name}`);
      return;
    }

    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d'); // Cambié el nombre de 'ctx' a 'canvasContext'
    canvas.width = logoData.width;
    canvas.height = logoData.height;
    
    menuDiv.appendChild(canvas);

    canvasContext.drawImage(
      this.image,
      logoData.x, logoData.y, logoData.width, logoData.height,
      0, 0, logoData.width, logoData.height
    );

    console.log(`Animación para ${name} cargada y renderizada.`);
  }
}
