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
    this.onGearToggle = null;
    this.onSwitchCamera = null;
    this.onToggleHandling = null;

    this.popupTimer = null;
    this.levelUpTimer = null;
    this.maxRecordedSpeed = 0;

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
            <span class="hud-stat-label">LEVEL</span>
            <span class="hud-stat-val" id="hud-level">LV 1</span>
          </div>

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
            <button id="btn-hud-camera" class="hud-icon-btn camera-button" title="Switch camera (C)" aria-label="Switch camera">C <span id="camera-mode">CHASE</span></button>
            <button id="btn-hud-sound" class="hud-icon-btn" title="Toggle Sound" aria-label="Toggle Sound">
              <span id="sound-icon-on">🔊</span>
              <span id="sound-icon-off" class="hidden">🔇</span>
            </button>
            <button id="btn-hud-pause" class="hud-icon-btn" title="Pause Game (Esc)" aria-label="Pause Game">
              ⏸
            </button>
          </div>
        </div>

        <div class="route-caption">
          <span>M-2 MOTORWAY · 5 LANES NORTHBOUND</span>
          <b>CURVED HIGHWAY · ASSISTED ARCADE</b>
          <small>WASD / ARROWS · STEER &nbsp; SHIFT · NITRO &nbsp; SPACE · DRIFT &nbsp; G · GEAR &nbsp; C · CAMERA &nbsp; R · RESTART</small>
        </div>

        <!-- Level-Up Notification Toast -->
        <div id="hud-level-up-popup" class="hud-level-up-popup hidden">
          <div class="level-up-eyebrow">HIGHWAY SECTION CLEARED</div>
          <div class="level-up-title" id="hud-level-up-title">LEVEL 2</div>
          <div class="level-up-sub" id="hud-level-up-desc">CURVES SHARPEN · TRAFFIC EXPANDS</div>
        </div>

        <!-- Floating Near-Miss Alert Toast -->
        <div id="hud-near-miss-popup" class="hud-near-miss-popup hidden">
          <span class="popup-title">NEAR MISS!</span>
          <span class="popup-pts" id="popup-pts">+250 PTS</span>
        </div>

        <!-- Floating Drift Alert Toast -->
        <div id="hud-drift-popup" class="hud-drift-popup hidden">
          <span class="drift-title">DRIFT!</span>
          <span class="drift-pts" id="hud-drift-pts">+120 PTS</span>
        </div>

        <!-- Speedometer, Nitro Gauge & Gear Cluster (Bottom Right) -->
        <div class="hud-telemetry-cluster">
          <div class="hud-gear-and-nos">
            <button id="hud-gear" class="hud-gear-pill" title="Current Gear · Tap to shift (G)">D</button>
            <div class="hud-nitro-gauge" title="Nitro Boost (Shift)">
              <div class="nitro-header">
                <span class="nitro-label">NOS</span>
                <span class="nitro-pct" id="hud-nitro-pct">100%</span>
              </div>
              <div class="nitro-track">
                <div id="hud-nitro-fill" class="nitro-fill" style="width: 100%;"></div>
              </div>
            </div>
          </div>

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
        </div>

        <!-- Mobile Touch Controls -->
        <div id="hud-mobile-controls" class="hud-mobile-controls">
          <div class="mobile-left-cluster">
            <button id="touch-left" class="touch-btn steer-btn" aria-label="Steer Left">
              <svg viewBox="0 0 44 44" class="touch-icon steer-icon" aria-hidden="true">
                <path d="M 27 10 L 15 22 L 27 34" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M 33 14 L 23 22 L 33 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
              </svg>
            </button>
            <button id="touch-right" class="touch-btn steer-btn" aria-label="Steer Right">
              <svg viewBox="0 0 44 44" class="touch-icon steer-icon" aria-hidden="true">
                <path d="M 17 10 L 29 22 L 17 34" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M 11 14 L 21 22 L 11 30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
              </svg>
            </button>
          </div>

          <div class="mobile-right-cluster">
            <!-- Mobile Action Row (Nitro, Drift, Gear) -->
            <div class="mobile-actions-row">
              <button id="touch-gear" class="touch-action-btn gear-action-btn" aria-label="Shift Gear">
                <span class="action-label">GEAR</span>
                <span class="action-val" id="touch-gear-val">D</span>
              </button>
              <button id="touch-drift" class="touch-action-btn drift-action-btn" aria-label="Handbrake Drift">
                <span class="action-icon">⚡</span>
                <span class="action-label">DRIFT</span>
              </button>
              <button id="touch-nitro" class="touch-action-btn nitro-action-btn" aria-label="Nitro Boost">
                <span class="action-icon">🔥</span>
                <span class="action-label">NOS</span>
              </button>
            </div>

            <!-- Pedals Row (Brake & Gas) -->
            <div class="mobile-pedals-row">
              <button id="touch-brake" class="touch-btn pedal-btn pedal-brake" aria-label="Brake / Reverse">
                <svg viewBox="0 0 60 70" class="touch-icon pedal-icon pedal-brake-icon" aria-hidden="true">
                  <rect x="4" y="4" width="52" height="62" rx="9" fill="rgba(38,12,16,0.92)" stroke="#ef4050" stroke-width="1.8"/>
                  <rect x="8" y="8" width="44" height="54" rx="6" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
                  <rect x="12" y="15" width="36" height="4.5" rx="2.2" fill="#ef4050" opacity="0.95"/>
                  <rect x="12" y="24" width="36" height="4.5" rx="2.2" fill="#ef4050" opacity="0.95"/>
                  <rect x="12" y="33" width="36" height="4.5" rx="2.2" fill="#ef4050" opacity="0.95"/>
                  <rect x="12" y="42" width="36" height="4.5" rx="2.2" fill="#ef4050" opacity="0.95"/>
                  <circle cx="18" cy="54" r="2.5" fill="#ff6b7a"/>
                  <circle cx="30" cy="54" r="2.5" fill="#ff6b7a"/>
                  <circle cx="42" cy="54" r="2.5" fill="#ff6b7a"/>
                </svg>
                <span class="pedal-sub-label">BRAKE</span>
              </button>
              <button id="touch-throttle" class="touch-btn pedal-btn pedal-gas" aria-label="Accelerate">
                <svg viewBox="0 0 50 80" class="touch-icon pedal-icon pedal-gas-icon" aria-hidden="true">
                  <path d="M 7 10 Q 7 5 12 5 L 38 5 Q 43 5 43 10 L 41 70 Q 41 75 36 75 L 14 75 Q 9 75 9 70 Z" fill="rgba(12,30,38,0.92)" stroke="#4deeea" stroke-width="1.8"/>
                  <line x1="16" y1="14" x2="16" y2="65" stroke="#4deeea" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
                  <line x1="25" y1="12" x2="25" y2="67" stroke="#4deeea" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
                  <line x1="34" y1="14" x2="34" y2="65" stroke="#4deeea" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
                  <circle cx="20.5" cy="22" r="1.6" fill="#ffffff" opacity="0.8"/>
                  <circle cx="29.5" cy="22" r="1.6" fill="#ffffff" opacity="0.8"/>
                  <circle cx="20.5" cy="38" r="1.6" fill="#ffffff" opacity="0.8"/>
                  <circle cx="29.5" cy="38" r="1.6" fill="#ffffff" opacity="0.8"/>
                  <circle cx="20.5" cy="54" r="1.6" fill="#ffffff" opacity="0.8"/>
                  <circle cx="29.5" cy="54" r="1.6" fill="#ffffff" opacity="0.8"/>
                </svg>
                <span class="pedal-sub-label">GAS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Menu Modal -->
      <div id="menu-modal" class="menu-modal-overlay">
        <div class="menu-card glass-panel">
          <div class="menu-header">
            <div class="brand-tag">TECH WITH SALMAN / MOTORSPORT</div>
            <h1 class="game-title">HIGHWAY RACER <span class="accent-3d">3D</span></h1>
            <p class="game-subtitle">Wide 5-lane highway. Dynamic curves. Pro arcade racing.</p>
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
            <div class="btn-secondary-race" style="margin-top: 8px; font-size: 12px; padding: 10px 18px; border-color: rgba(77, 238, 234, 0.35); cursor: default; opacity: 0.9;">
              HANDLING: ASSISTED ARCADE · 5-LANE ONE-WAY
            </div>
          </div>

          <!-- Controls hint -->
          <div class="controls-guide">
            <div class="guide-col">
              <span class="guide-title">DESKTOP CONTROLS</span>
              <span class="guide-key"><b>W / ▲</b> Accelerate &nbsp; <b>S / ▼</b> Brake / Reverse</span>
              <span class="guide-key"><b>A / D / ◄ / ►</b> Smooth Lane Steer (Auto-centers)</span>
              <span class="guide-key"><b>SHIFT / N</b> Nitro Boost &nbsp; <b>SPACE</b> Handbrake Drift</span>
              <span class="guide-key"><b>G</b> Shift Gear (D/R) &nbsp; <b>C</b> Camera &nbsp; <b>R</b> Restart</span>
            </div>
            <div class="guide-col">
              <span class="guide-title">MOBILE / TOUCH</span>
              <span class="guide-key"><b>Left:</b> Steer Left / Right</span>
              <span class="guide-key"><b>Right:</b> Gas, Brake, Nitro, Drift, Gear</span>
            </div>
          </div>
          <div class="asset-credit">Ferrari 458 Italia by <a href="https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6" target="_blank" rel="noopener">vicent091036</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · <a href="./credits.html" target="_blank" rel="noopener">Asset credits</a></div>
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
              <span class="label">LEVEL REACHED</span>
              <span class="val" id="go-level">LEVEL 1</span>
            </div>
            <div class="gameover-stat-item">
              <span class="label">NEAR MISSES</span>
              <span class="val" id="go-near-miss">0</span>
            </div>
            <div class="gameover-stat-item">
              <span class="label">TOP SPEED</span>
              <span class="val" id="go-top-speed">0 KM/H</span>
            </div>
            <div class="gameover-stat-item">
              <span class="label">BONUS POINTS</span>
              <span class="val" id="go-bonus-pts">0</span>
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

    this.hudLevel = document.getElementById('hud-level');
    this.hudDistance = document.getElementById('hud-distance');
    this.hudScore = document.getElementById('hud-score');
    this.hudBestScore = document.getElementById('hud-best-score');
    this.hudComboBadge = document.getElementById('hud-combo-badge');
    this.hudSpeedNum = document.getElementById('hud-speed-num');
    this.speedoFill = document.getElementById('speedo-fill');

    this.hudGear = document.getElementById('hud-gear');
    this.hudNitroFill = document.getElementById('hud-nitro-fill');
    this.hudNitroPct = document.getElementById('hud-nitro-pct');
    this.touchGearVal = document.getElementById('touch-gear-val');

    this.levelUpPopup = document.getElementById('hud-level-up-popup');
    this.levelUpTitle = document.getElementById('hud-level-up-title');
    this.levelUpDesc = document.getElementById('hud-level-up-desc');

    this.nearMissPopup = document.getElementById('hud-near-miss-popup');
    this.popupPts = document.getElementById('popup-pts');
    this.driftPopup = document.getElementById('hud-drift-popup');
    this.driftPts = document.getElementById('hud-drift-pts');

    this.menuHighScore = document.getElementById('menu-highscore-val');
    this.menuHighDist = document.getElementById('menu-highdist-val');

    this.goScore = document.getElementById('go-score');
    this.goDistance = document.getElementById('go-distance');
    this.goLevel = document.getElementById('go-level');
    this.goNearMiss = document.getElementById('go-near-miss');
    this.goTopSpeed = document.getElementById('go-top-speed');
    this.goBonusPts = document.getElementById('go-bonus-pts');
    this.newRecordBadge = document.getElementById('new-record-badge');

    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');

    this.updateSoundIcons(this.gameState.soundEnabled);
    this.updateHighScores();
  }

  bindEvents() {
    document.getElementById('btn-hud-camera').addEventListener('click', () => this.onSwitchCamera?.());

    const toggleHandlingBtn = document.getElementById('btn-toggle-handling');
    if (toggleHandlingBtn) {
      toggleHandlingBtn.addEventListener('click', () => {
        this.audio.playButtonClick();
        if (this.onToggleHandling) {
          const newMode = this.onToggleHandling();
          toggleHandlingBtn.textContent = newMode === 'ARCADE'
            ? 'HANDLING: ASSISTED ARCADE (RECOMMENDED)'
            : 'HANDLING: ADVANCED FREESTYLE (360°)';
          toggleHandlingBtn.style.borderColor = newMode === 'ARCADE'
            ? 'rgba(77, 238, 234, 0.4)'
            : 'rgba(255, 190, 11, 0.6)';
        }
      });
    }

    // Gear Shift Buttons (HUD pill & Mobile button)
    this.hudGear.addEventListener('click', () => this.onGearToggle?.());
    const touchGear = document.getElementById('touch-gear');
    if (touchGear) {
      touchGear.addEventListener('click', (e) => {
        e.preventDefault();
        this.onGearToggle?.();
      });
      touchGear.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.onGearToggle?.();
      }, { passive: false });
    }

    // Menu buttons
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.audio.ensureContext();
      this.audio.playButtonClick();
      this.onStartGame?.();
    });

    document.getElementById('btn-resume-game').addEventListener('click', () => {
      this.audio.playButtonClick();
      this.onResumeGame?.();
    });

    document.getElementById('btn-restart-from-pause').addEventListener('click', () => {
      this.audio.playButtonClick();
      this.onRestartGame?.();
    });

    document.getElementById('btn-menu-from-pause').addEventListener('click', () => {
      this.audio.playButtonClick();
      this.onMainMenu?.();
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
      this.audio.playButtonClick();
      this.onRestartGame?.();
    });

    document.getElementById('btn-main-menu').addEventListener('click', () => {
      this.audio.playButtonClick();
      this.onMainMenu?.();
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
    bindTouch('touch-drift', 'handbrake');
    bindTouch('touch-nitro', 'nitro');
  }

  subscribeGameState() {
    this.gameState.on('reset', () => {
      this.maxRecordedSpeed = 0;
      clearTimeout(this.popupTimer);
      clearTimeout(this.levelUpTimer);
      this.nearMissPopup.classList.add('hidden');
      this.nearMissPopup.classList.remove('pop-anim');
      this.driftPopup.classList.add('hidden');
      this.levelUpPopup.classList.add('hidden');
      this.hudComboBadge.classList.add('hidden');
      this.updateHighScores();
    });

    this.gameState.on('stateChanged', ({ to }) => {
      this.handleStateChange(to);
    });

    this.gameState.on('nearMiss', ({ combo, earned }) => {
      this.showNearMissPopup(combo, earned);
    });

    this.gameState.on('levelUp', ({ level }) => {
      this.showLevelUpPopup(level);
    });

    this.gameState.on('comboReset', () => {
      this.hudComboBadge.classList.add('hidden');
    });
  }

  handleStateChange(state) {
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

  setCameraMode(name) {
    document.getElementById('camera-mode').textContent = name;
    document.getElementById('btn-hud-camera').setAttribute('aria-label', `Camera: ${name}. Switch camera`);
  }

  updateHighScores() {
    this.menuHighScore.textContent = Math.floor(this.gameState.highScore).toLocaleString();
    this.menuHighDist.textContent = `${Math.floor(this.gameState.highDistance).toLocaleString()} m`;
    this.hudBestScore.textContent = Math.floor(this.gameState.highScore).toLocaleString();
  }

  showGameOverSummary() {
    this.goScore.textContent = Math.floor(this.gameState.score).toLocaleString();
    this.goDistance.textContent = `${Math.floor(this.gameState.distance).toLocaleString()} m`;
    this.goLevel.textContent = `LEVEL ${this.gameState.difficultyLevel || 1}`;
    this.goNearMiss.textContent = this.gameState.nearMisses;
    this.goTopSpeed.textContent = `${Math.floor(this.maxRecordedSpeed || 0)} KM/H`;
    const bonus = Math.floor(this.gameState.driftScore || 0);
    this.goBonusPts.textContent = `+${bonus.toLocaleString()} PTS`;

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

  showLevelUpPopup(level) {
    const descs = [
      '',
      'EASY · GENTLE CURVES & LIGHT TRAFFIC',
      'NORMAL · SWEEPING BENDS & CRUISING TRAFFIC',
      'HARD · DYNAMIC S-CURVES & HIGHER DENSITY',
      'EXPERT · BUSY 5-LANE EXPRESSWAY',
      'ENDLESS CHALLENGE · MAXIMUM TRAFFIC & SPEED'
    ];
    this.levelUpTitle.textContent = `LEVEL ${level}`;
    this.levelUpDesc.textContent = descs[level] || 'HIGH SPEED MASTERY';
    this.levelUpPopup.classList.remove('hidden');
    this.levelUpPopup.classList.add('pop-anim');

    clearTimeout(this.levelUpTimer);
    this.levelUpTimer = setTimeout(() => {
      this.levelUpPopup.classList.add('hidden');
      this.levelUpPopup.classList.remove('pop-anim');
    }, 2400);
  }

  update(speedKmh, playerCar = null) {
    if (!this.gameState.isPlaying()) return;

    // Track top speed achieved
    this.maxRecordedSpeed = Math.max(this.maxRecordedSpeed || 0, speedKmh);

    // Update Level Indicator
    this.hudLevel.textContent = `LV ${this.gameState.difficultyLevel || 1}`;

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
    const maxSpeed = 240;
    const ratio = Math.min(1.0, speedKmh / maxSpeed);
    const strokeLength = 320;
    const offset = strokeLength - (ratio * strokeLength);
    this.speedoFill.style.strokeDashoffset = offset;

    // Dial color transitions from neutral to fiery crimson at top speeds
    if (speedKmh > 190) {
      this.speedoFill.style.stroke = '#ff2a44';
    } else if (speedKmh > 130) {
      this.speedoFill.style.stroke = '#ff9900';
    } else {
      this.speedoFill.style.stroke = '#eee9d8';
    }

    // Gear & Nitro Telemetry
    if (playerCar) {
      const gear = playerCar.gear || 'D';
      this.hudGear.textContent = gear;
      if (gear === 'R') {
        this.hudGear.classList.add('gear-reverse');
      } else {
        this.hudGear.classList.remove('gear-reverse');
      }
      if (this.touchGearVal) this.touchGearVal.textContent = gear;

      const nitroVal = Math.max(0, Math.min(100, playerCar.nitro || 100));
      this.hudNitroFill.style.width = `${nitroVal.toFixed(0)}%`;
      this.hudNitroPct.textContent = `${Math.round(nitroVal)}%`;
      if (playerCar.isNitroActive) {
        this.hudNitroFill.classList.add('nitro-active');
      } else {
        this.hudNitroFill.classList.remove('nitro-active');
      }

      // Drift Alert Popup
      if (playerCar.isDrifting && speedKmh > 25) {
        this.driftPopup.classList.remove('hidden');
        this.driftPts.textContent = `+${Math.round(this.gameState.driftScore || 0)} PTS`;
      } else {
        this.driftPopup.classList.add('hidden');
      }
    }
  }
}