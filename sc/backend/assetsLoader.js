// sc/backend/assetsLoader.js
export default class AssetsLoader {
  constructor() {
    this.images = {};
    this.sounds = {};
    this.jsons = {};
  }

  /**
   * Cargar una imagen y devolver una promesa
   */
  loadImage(key, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        resolve(img);
      };
      img.onerror = () => reject(`Error al cargar imagen: ${src}`);
      img.src = src;
    });
  }

  /**
   * Cargar un sonido (ogg/mp3)
   */
  loadSound(key, src) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.addEventListener("canplaythrough", () => {
        this.sounds[key] = audio;
        resolve(audio);
      });
      audio.onerror = () => reject(`Error al cargar sonido: ${src}`);
      audio.src = src;
    });
  }

  /**
   * Cargar JSON
   */
  loadJSON(key, src) {
    return fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Error al cargar JSON: ${src}`);
        return res.json();
      })
      .then((data) => {
        this.jsons[key] = data;
        return data;
      });
  }

  /**
   * Cargar múltiples assets en paralelo
   */
  loadAll(assets) {
    const promises = [];

    if (assets.images) {
      for (const [key, src] of Object.entries(assets.images)) {
        promises.push(this.loadImage(key, src));
      }
    }

    if (assets.sounds) {
      for (const [key, src] of Object.entries(assets.sounds)) {
        promises.push(this.loadSound(key, src));
      }
    }

    if (assets.jsons) {
      for (const [key, src] of Object.entries(assets.jsons)) {
        promises.push(this.loadJSON(key, src));
      }
    }

    return Promise.all(promises);
  }

  /**
   * Obtener un asset ya cargado
   */
  get(type, key) {
    if (type === "image") return this.images[key];
    if (type === "sound") return this.sounds[key];
    if (type === "json") return this.jsons[key];
    return null;
  }
}
