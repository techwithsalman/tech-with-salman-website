// Highway Racer 3D - High-Performance Racing HUD & Menus

import { STATES } from '../core/GameState.js';

export class HUD {
  constructor(container, gameState, inputManager, audioSystem) {
    this.container = container;
    this.gameState = gameState;
    this.input = inputManager;
    this.audio = audioSystem;

    this.onStartGame = null;
    this.onResumeGame = null;
    this.onRestartGame = null;
    this.onMainMenu = null;

    this.buildDOM();
    this.bindEvents();
    this.subscribeGameState();
  }

  buildDOM() {
    this.container.innerHTML = `
      <!-- In-Game HUD Layer -->
      <div id="hud-layer" class="hud-overlay hud-hidden">
        <!-- Top Stats Bar -->
        <div class="hud-top-bar">
          <div class="hud-stat-box">
            <span class="hud-stat-label">DISTANCE</span>
            <span class="hud-stat-val" id="hud-distance">0 m</span>
          </div>

          <div class="hud-stat-box hud-center-score">
            <span class="hud-stat-label">SCORE</span>
            <span class="hud-stat-val hud-glow-val" id="hud-score">0</span>
            <div id="hud-combo-badge" class="hud-combo-badge hidden">1X COMBO</div>
          </div>

          <div class="hud-stat-box">
            <span class="hud-stat-label">BEST</span>
            <span class="hud-stat-val" id="hud-best-score">0</span>
          </div>

          <!-- Utility buttons -->
          <div class="hud-controls-row">
            <button id="btn-hud-sound" class="hud-icon-btn" title="Toggle Sound" aria-label="Toggle Sound">
              <span id="sound-icon-on">🔊</span>
              <span id="sound-icon-off" class="hidden">🔇</span>
            </button>
            <button id="btn-hud-pause" class="hud-icon-btn" title="Pause Game (Esc)" aria-label="Pause Game">
              ⏸
            </button>
          </div>
        </div>

        <!-- Floating Near-Miss Alert Toast -->
        <div id="hud-near-miss-popup" class="hud-near-miss-popup hidden">
          <span class="popup-title">NEAR MISS!</span>
          <span class="popup-pts" id="popup-pts">+250 PTS</span>
        </div>

        <!-- Speedometer Gauge (Bottom Right) -->
        <div class="hud-speedometer-box">
          <div class="speedo-dial">
            <svg class="speedo-svg" viewBox="0 0 160 160">
              <circle class="speedo-bg-track" cx="80" cy="80" r="68" />
              <circle class="speedo-fill-track" id="speedo-fill" cx="80" cy="80" r="68" />
            </svg>
            <div class="speedo-center">
              <span class="speedo-number" id="hud-speed-num">0</span>
              <span class="speedo-unit">KM/H</span>
            </div>
          </div>
        </div>

        <!-- Mobile Touch Controls -->
        <div id="hud-mobile-controls" class="hud-mobile-controls">
          <div class="mobile-left-cluster">
            <button id="touch-left" class="touch-btn steer-btn" aria-label="Steer Left">◀</button>
            <button id="touch-right" class="touch-btn steer-btn" aria-label="Steer Right">▶</button>
          </div>
          <div class="mobile-right-cluster">
            <button id="touch-brake" class="touch-btn pedal-btn pedal-brake" aria-label="Brake">BRAKE</button>
            <button id="touch-throttle" class="touch-btn pedal-btn pedal-gas" aria-label="Accelerate">GAS</button>
          </div>
        </div>
      </div>

      <!-- Main Menu Modal -->
      <div id="menu-modal" class="menu-modal-overlay">
        <div class="menu-card glass-panel">
          <div class="menu-header">
            <div class="brand-tag">TECH WITH SALMAN</div>
            <h1 class="game-title">HIGHWAY RACER <span class="accent-3d">3D</span></h1>
            <p class="game-subtitle">Endless High-Speed Traffic Racing</p>
          </div>

          <div class="menu-stats-row">
            <div class="menu-stat-pill">
              <span class="label">HIGH SCORE</span>
              <span class="val" id="menu-highscore-val">0</span>
            </div>
            <div class="menu-stat-pill">
              <span class="label">MAX DISTANCE</span>
              <span class="val" id="menu-highdist-val">0 m</span>
            </div>
          </div>

          <div class="menu-actions">
            <button id="btn-start-game" class="btn-primary-race">
              <span class="btn-glow"></span>
              <span class="btn-text">START RACE</span>
              <span class="btn-arrow">→</span>
            </button>
          </div>

          <!-- Controls hint -->
          <div class="controls-guide">
            <div class="guide-col">
              <span class="guide-title">DESKTOP</span>
              <span class="guide-key"><b>W / ▲</b> Accelerate</span>
              <span class="guide-key"><b>S / ▼</b> Brake</span>
              <span class="guide-key"><b>A / D / ◄ / ►</b> Steer</span>
              <span class="guide-key"><b>SPACE</b> Handbrake</span>
              <span class="guide-key"><b>ESC</b> Pause</span>
            </div>
            <div class="guide-col">
              <span class="guide-title">MOBILE / TOUCH</span>
              <span class="guide-key"><b>Left Cluster:</b> Steer</span>
              <span class="guide-key"><b>Right Cluster:</b> Gas / Brake</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pause Menu Modal -->
      <div id="pause-modal" class="menu-modal-overlay hidden">
        <div class="menu-card glass-panel pause-card">
          <h2 class="modal-title">GAME PAUSED</h2>
          <div class="pause-actions">
            <button id="btn-resume-game" class="btn-primary-race">RESUME</button>
            <button id="btn-restart-from-pause" class="btn-secondary-race">RESTART</button>
            <button id="btn-menu-from-pause" class="btn-tertiary-race">MAIN MENU</button>
          </div>
        </div>
      </div>

      <!-- Game Over Modal -->
      <div id="gameover-modal" class="menu-modal-overlay hidden">
        <div class="menu-card glass-panel gameover-card">
          <div class="crash-banner">
            <div class="crash-icon">💥</div>
            <h2 class="crash-title">CRASHED!</h2>
          </div>

          <div id="new-record-badge" class="new-record-badge hidden">🏆 NEW RECORD!</div>

          <div class="gameover-stats-grid">
            <div class="gameover-stat-item">
              <span class="label">FINAL SCORE</span>
              <span class="val glow-val" id="go-score">0</span>
            </div>
            <div class="gameover-stat-item">
              <span class="label">DISTANCE</span>
              <span class="val" id="go-distance">0 m</span>
            </div>
            <div class="gameover-stat-item">
              <span class="label">NEAR MISSES</span>
              <span class="val" id="go-near-miss">0</span>
            </div>
            <div class="gameover-stat-item">
              <span class="label">TOP SPEED</span>
              <span class="val" id="go-top-speed">0 KM/H</span>
            </div>
          </div>

          <div class="gameover-actions">
            <button id="btn-restart-game" class="btn-primary-race">
              <span class="btn-glow"></span>
              <span class="btn-text">RACE AGAIN</span>
            </button>
            <button id="btn-main-menu" class="btn-secondary-race">MAIN MENU</button>
          </div>
        </div>
      </div>
    `;

    // Cache element references
    this.hudLayer = document.getElementById('hud-layer');
    this.menuModal = document.getElementById('menu-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameoverModal = document.getElementById('gameover-modal');

    this.hudDistance = document.getElementById('hud-distance');
    this.hudScore = document.getElementById('hud-score');
    this.hudBestScore = document.getElementById('hud-best-score');
    this.hudComboBadge = document.getElementById('hud-combo-badge');
    this.hudSpeedNum = document.getElementById('hud-speed-num');
    this.speedoFill = document.getElementById('speedo-fill');
    this.nearMissPopup = document.getElementById('hud-near-miss-popup');
    this.popupPts = document.getElementById('popup-pts');

    this.menuHighScore = document.getElementById('menu-highscore-val');
    this.menuHighDist = document.getElementById('menu-highdist-val');

    this.goScore = document.getElementById('go-score');
    this.goDistance = document.getElementById('go-distance');
    this.goNearMiss = document.getElementById('go-near-miss');
    this.goTopSpeed = document.getElementById('go-top-speed');
    this.newRecordBadge = document.getElementById('new-record-badge');

    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');

    this.updateSoundIcons(this.gameState.soundEnabled);
    this.updateHighScores();
  }

  bindEvents() {
    // Menu buttons
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.audio.ensureContext();
      this.audio.playButtonClick();
      if (this.onStartGame) this.onStartGame();
    });

    document.getElementById('btn-resume-game').addEventListener('click', () => {
      this.audio.playButtonClick();
      if (this.onResumeGame) this.onResumeGame();
    });

    document.getElementById('btn-restart-from-pause').addEventListener('click', () => {
      this.audio.playButtonClick();
      if (this.onRestartGame) this.onRestartGame();
    });

    document.getElementById('btn-menu-from-pause').addEventListener('click', () => {
      this.audio.playButtonClick();
      if (this.onMainMenu) this.onMainMenu();
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.audio.playButtonClick();
      if (this.onRestartGame) this.onRestartGame();
    });

    document.getElementById('btn-main-menu').addEventListener('click', () => {
      this.audio.playButtonClick();
      if (this.onMainMenu) this.onMainMenu();
    });

    // In-game HUD buttons
    document.getElementById('btn-hud-sound').addEventListener('click', () => {
      const enabled = this.gameState.toggleSound();
      this.updateSoundIcons(enabled);
    });

    document.getElementById('btn-hud-pause').addEventListener('click', () => {
      this.audio.playButtonClick();
      if (this.gameState.isPlaying()) {
        this.gameState.setState(STATES.PAUSED);
      }
    });

    // Mobile Touch buttons
    const bindTouch = (id, action) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      
      const start = (e) => {
        e.preventDefault();
        this.input.setTouchInput(action, true);
        btn.classList.add('active');
      };
      const end = (e) => {
        e.preventDefault();
        this.input.setTouchInput(action, false);
        btn.classList.remove('active');
      };

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    };

    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-throttle', 'throttle');
    bindTouch('touch-brake', 'brake');
  }

  subscribeGameState() {
    this.gameState.on('stateChanged', ({ to }) => {
      this.handleStateChange(to);
    });

    this.gameState.on('nearMiss', ({ combo, earned }) => {
      this.showNearMissPopup(combo, earned);
    });

    this.gameState.on('comboReset', () => {
      this.hudComboBadge.classList.add('hidden');
    });
  }

  handleStateChange(state) {
    // Hide all modals by default
    this.menuModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.gameoverModal.classList.add('hidden');
    this.hudLayer.classList.add('hud-hidden');

    switch (state) {
      case STATES.MENU:
        this.menuModal.classList.remove('hidden');
        this.updateHighScores();
        break;

      case STATES.PLAYING:
        this.hudLayer.classList.remove('hud-hidden');
        break;

      case STATES.PAUSED:
        this.hudLayer.classList.remove('hud-hidden');
        this.pauseModal.classList.remove('hidden');
        break;

      case STATES.GAMEOVER:
        this.hudLayer.classList.remove('hud-hidden');
        this.gameoverModal.classList.remove('hidden');
        this.showGameOverSummary();
        break;
    }
  }

  updateSoundIcons(enabled) {
    if (enabled) {
      this.soundIconOn.classList.remove('hidden');
      this.soundIconOff.classList.add('hidden');
    } else {
      this.soundIconOn.classList.add('hidden');
      this.soundIconOff.classList.remove('hidden');
    }
  }

  updateHighScores() {
    this.menuHighScore.textContent = Math.floor(this.gameState.highScore).toLocaleString();
    this.menuHighDist.textContent = `${Math.floor(this.gameState.highDistance).toLocaleString()} m`;
    this.hudBestScore.textContent = Math.floor(this.gameState.highScore).toLocaleString();
  }

  showGameOverSummary() {
    this.goScore.textContent = Math.floor(this.gameState.score).toLocaleString();
    this.goDistance.textContent = `${Math.floor(this.gameState.distance).toLocaleString()} m`;
    this.goNearMiss.textContent = this.gameState.nearMisses;
    this.goTopSpeed.textContent = `${Math.floor(this.maxRecordedSpeed || 0)} KM/H`;

    const isNewRecord = this.gameState.score >= this.gameState.highScore && this.gameState.score > 0;
    if (isNewRecord) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }
  }

  showNearMissPopup(combo, earned) {
    this.popupPts.textContent = `+${earned} PTS (${combo}X)`;
    this.nearMissPopup.classList.remove('hidden');
    this.nearMissPopup.classList.add('pop-anim');

    if (combo > 1) {
      this.hudComboBadge.textContent = `${combo}X COMBO!`;
      this.hudComboBadge.classList.remove('hidden');
    }

    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => {
      this.nearMissPopup.classList.add('hidden');
      this.nearMissPopup.classList.remove('pop-anim');
    }, 1100);
  }

  update(speedKmh) {
    if (!this.gameState.isPlaying()) return;

    // Track top speed achieved
    this.maxRecordedSpeed = Math.max(this.maxRecordedSpeed || 0, speedKmh);

    // Update Distance
    if (this.gameState.distance >= 1000) {
      this.hudDistance.textContent = `${(this.gameState.distance / 1000).toFixed(2)} km`;
    } else {
      this.hudDistance.textContent = `${Math.floor(this.gameState.distance)} m`;
    }

    // Update Score
    this.hudScore.textContent = Math.floor(this.gameState.score).toLocaleString();

    // Update Speedometer
    const roundedSpeed = Math.floor(speedKmh);
    this.hudSpeedNum.textContent = roundedSpeed;

    // Speedometer dial fill (SVG stroke dashoffset from 0 to 240 km/h)
    // Full circumference for r=68 is ~427. 3/4 gauge arc is ~320.
    const maxSpeed = 240;
    const ratio = Math.min(1.0, speedKmh / maxSpeed);
    const strokeLength = 320;
    const offset = strokeLength - (ratio * strokeLength);
    this.speedoFill.style.strokeDashoffset = offset;

    // Dial color transitions from cyan to fiery red/orange at top speeds
    if (speedKmh > 190) {
      this.speedoFill.style.stroke = '#ff2a44';
    } else if (speedKmh > 130) {
      this.speedoFill.style.stroke = '#ff9900';
    } else {
      this.speedoFill.style.stroke = '#00f0ff';
    }
  }
}
