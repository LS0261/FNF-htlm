import { loadAlphabetAtlas } from '../backend/atlasLoader.js';

export class Alphabet {
  static allowedChars = null;
  static characters = null; // Para caracteres especiales del JSON

  static async loadAllowedChars(jsonPath = 'images/alphabet.json') {
    const res = await fetch(jsonPath);
    const data = await res.json();
    Alphabet.allowedChars = data.allowed.split('');
    Alphabet.characters = data.characters;

    console.log(`✅ Caracteres permitidos cargados (${Alphabet.allowedChars.length}):`, Alphabet.allowedChars.join(''));
    console.log('Caracteres especiales cargados:', Object.keys(Alphabet.characters));
  }

  static async createWithResources(text, jsonPath = 'images/alphabet.json', atlasXmlPath = 'images/alphabet.xml', atlasImagePath = 'images/alphabet.png', container, scale = 1) {
    await Alphabet.loadAllowedChars(jsonPath);
    const atlas = await loadAlphabetAtlas(atlasXmlPath);
    return new Alphabet(text, atlas, container, scale, atlasImagePath);
  }

  constructor(text, atlas, container, scale = 1, atlasImagePath = 'images/alphabet.png') {
    this.text = text;
    this.atlas = atlas;
    this.container = container;
    this.scale = scale;
    this.atlasImagePath = atlasImagePath;

    this.letterElements = [];

    console.log(`🆕 Instanciando Alphabet con el texto: "${text}"`);
    console.log('Atlas recibido:', this.atlas);

    this.render();
  }

  getCharFrames(char, stylePriority = ['bold', 'normal', 'lowercase', 'uppercase']) {
    const lowerChar = char.toLowerCase();
    if (lowerChar === ' ') return null;

    const charData = Alphabet.characters?.[char];
    if (charData) {
      console.log(`🔧 Carácter especial detectado: '${char}'`, charData);

      // Si tiene animación (por nombre)
      if (charData.animation) {
        const animationName = charData.animation.toLowerCase();
        for (const style of stylePriority) {
          const keys = Object.keys(this.atlas).filter(k =>
            k.toLowerCase().startsWith(`${animationName} ${style.toLowerCase()} instance`)
          );

          if (keys.length > 0) {
            keys.sort((a, b) => {
              const getInstanceNum = key => {
                const match = key.match(/instance\s*(\d+)/i);
                return match ? parseInt(match[1], 10) : 0;
              };
              return getInstanceNum(a) - getInstanceNum(b);
            });

            console.log(`✅ Animación encontrada para '${char}' →`, keys);
            return {
              frames: keys.map(k => this.atlas[k]),
              style
            };
          }
        }
      }

      // Si tiene offset manual (pero sin animación)
      for (const style of stylePriority) {
        if (charData[style]) {
          const keys = Object.keys(this.atlas).filter(k =>
            k.toLowerCase().startsWith(`${char} ${style.toLowerCase()} instance`)
          );

          if (keys.length > 0) {
            keys.sort((a, b) => {
              const getInstanceNum = key => {
                const match = key.match(/instance\s*(\d+)/i);
                return match ? parseInt(match[1], 10) : 0;
              };
              return getInstanceNum(a) - getInstanceNum(b);
            });

            console.log(`✅ Offset manual aplicado para '${char}' [${style}] →`, keys);
            return {
              frames: keys.map(k => this.atlas[k]),
              style
            };
          }
        }
      }
    }

    // Carácter regular
    for (const style of stylePriority) {
      const expectedPrefix = `${lowerChar} ${style.toLowerCase()} instance`;
      const keys = Object.keys(this.atlas).filter(k =>
        k.toLowerCase().startsWith(expectedPrefix)
      );

      console.log(`🔎 Buscando '${expectedPrefix}', encontrados:`, keys);

      if (keys.length > 0) {
        keys.sort((a, b) => {
          const getInstanceNum = key => {
            const match = key.match(/instance\s*(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getInstanceNum(a) - getInstanceNum(b);
        });

        console.log(`✅ Frames encontrados para '${char}' [estilo: ${style}] →`, keys);
        return {
          frames: keys.map(k => this.atlas[k]),
          style
        };
      }
    }

    console.warn(`🚫 No se encontró frames para '${char}' en ningún estilo ni como carácter especial`);
    return null;
  }

  render() {
    let x = 0;
    let y = 0;
    const spacing = 4;

    for (const char of this.text) {
      if (char === '\n') {
        x = 0;
        y += 80 * this.scale;
        continue;
      }

      if (Alphabet.allowedChars && !Alphabet.allowedChars.includes(char.toLowerCase())) {
        console.warn(`❌ Carácter no permitido: "${char}"`);
        continue;
      }

      const result = this.getCharFrames(char, ['bold', 'normal', 'lowercase', 'uppercase']);
      if (!result || !result.frames) {
        console.warn(`⚠️ No se encontró frames para el caracter "${char}"`);
        continue;
      }

      const { frames, style } = result;
      const div = document.createElement('div');
      div.classList.add('alphabet-letter');
      div.style.position = 'absolute';
      div.style.width = `${frames[0].width}px`;
      div.style.height = `${frames[0].height}px`;

      // Offset (si aplica desde el JSON)
      let offsetX = 0;
      let offsetY = 0;
      const charData = Alphabet.characters?.[char];
      if (charData && charData[style]) {
        const [offX, offY] = charData[style];
        offsetX = offX ?? 0;
        offsetY = offY ?? 0;
      }

      div.style.left = `${x + offsetX}px`;
      div.style.top = `${y + offsetY}px`;

      div.style.backgroundImage = `url('${this.atlasImagePath}')`;
      div.style.backgroundRepeat = 'no-repeat';
      div.style.transform = `scale(${this.scale})`;

      this.container.appendChild(div);

      let frameIndex = 0;
      setInterval(() => {
        const frame = frames[frameIndex];
        div.style.backgroundPosition = `-${frame.x}px -${frame.y}px`;

        frameIndex++;
        if (frameIndex >= frames.length) frameIndex = 0;
      }, 42);  // ~24 fps

      this.letterElements.push(div);

      x += (frames[0].width + spacing) * this.scale;
    }
  }
}
