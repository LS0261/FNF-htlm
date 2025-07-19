class SaveVariables {
  constructor() {
    this.downScroll = false;
    this.middleScroll = false;
    this.opponentStrums = true;
    this.showFPS = true;
    this.flashing = true;
    this.autoPause = true;
    this.antialiasing = true;
    this.noteSkin = 'Default';
    this.splashSkin = 'Psych';
    this.splashAlpha = 0.6;
    this.lowQuality = false;
    this.shaders = true;
    this.cacheOnGPU = false; // Simplificado
    this.framerate = 60;
    this.camZooms = true;
    this.hideHud = false;
    this.noteOffset = 0;
    this.arrowRGB = [
      [0xFFC24B99, 0xFFFFFFFF, 0xFF3C1F56],
      [0xFF00FFFF, 0xFFFFFFFF, 0xFF1542B7],
      [0xFF12FA05, 0xFFFFFFFF, 0xFF0A4447],
      [0xFFF9393F, 0xFFFFFFFF, 0xFF651038]
    ];
    this.arrowRGBPixel = [
      [0xFFE276FF, 0xFFFFF9FF, 0xFF60008D],
      [0xFF3DCAFF, 0xFFF4FFFF, 0xFF003060],
      [0xFF71E300, 0xFFF6FFE6, 0xFF003100],
      [0xFFFF884E, 0xFFFFFAF5, 0xFF6C0000]
    ];
    this.ghostTapping = true;
    this.timeBarType = 'Time Left';
    this.scoreZoom = true;
    this.noReset = false;
    this.healthBarAlpha = 1;
    this.hitsoundVolume = 0;
    this.pauseMusic = 'Tea Time';
    this.checkForUpdates = true;
    this.comboStacking = true;
    this.gameplaySettings = {
      scrollspeed: 1.0,
      scrolltype: 'multiplicative',
      songspeed: 1.0,
      healthgain: 1.0,
      healthloss: 1.0,
      instakill: false,
      practice: false,
      botplay: false,
      opponentplay: false
    };
    this.comboOffset = [0, 0, 0, 0];
    this.ratingOffset = 0;
    this.sickWindow = 45.0;
    this.goodWindow = 90.0;
    this.badWindow = 135.0;
    this.safeFrames = 10.0;
    this.guitarHeroSustains = true;
    this.discordRPC = true;
    this.loadingScreen = true;
    this.language = 'en-US';
  }
}

class ClientPrefs {
  constructor() {
    this.data = new SaveVariables();
    this.defaultData = new SaveVariables();

    // Bindings de teclado (simplificados)
    this.keyBinds = {
      note_up: ['W', 'ArrowUp'],
      note_left: ['A', 'ArrowLeft'],
      note_down: ['S', 'ArrowDown'],
      note_right: ['D', 'ArrowRight'],
      ui_up: ['W', 'ArrowUp'],
      ui_left: ['A', 'ArrowLeft'],
      ui_down: ['S', 'ArrowDown'],
      ui_right: ['D', 'ArrowRight'],
      accept: ['Space', 'Enter'],
      back: ['Backspace', 'Escape'],
      pause: ['Enter', 'Escape'],
      reset: ['R'],
      volume_mute: ['0'],
      volume_up: ['NumpadAdd', 'Plus'],
      volume_down: ['NumpadSubtract', 'Minus'],
      debug_1: ['7'],
      debug_2: ['8']
    };

    this.defaultKeys = JSON.parse(JSON.stringify(this.keyBinds)); // copia profunda
  }

  resetKeys() {
    this.keyBinds = JSON.parse(JSON.stringify(this.defaultKeys));
  }

  saveSettings() {
    localStorage.setItem('clientPrefsData', JSON.stringify(this.data));
    localStorage.setItem('clientPrefsKeyBinds', JSON.stringify(this.keyBinds));
    console.log('Configuración guardada');
  }

  loadPrefs() {
    let savedData = localStorage.getItem('clientPrefsData');
    if (savedData) {
      let parsed = JSON.parse(savedData);
      Object.assign(this.data, parsed);
    }

    let savedKeys = localStorage.getItem('clientPrefsKeyBinds');
    if (savedKeys) {
      let parsedKeys = JSON.parse(savedKeys);
      this.keyBinds = parsedKeys;
    }

    console.log('Configuración cargada');
  }

  getGameplaySetting(name, defaultValue = null) {
    if (defaultValue === null) defaultValue = this.defaultData.gameplaySettings[name];
    return this.data.gameplaySettings.hasOwnProperty(name) ? this.data.gameplaySettings[name] : defaultValue;
  }
}

export default ClientPrefs;
