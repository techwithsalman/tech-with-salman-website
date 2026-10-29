// Highway Racer 3D - Game State Manager with Progressive Levels & Scoring

export const STATES = {
  MENU: 'MENU',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

const HIGH_SCORE_KEY = 'tws_highway_racer_high_score';
const HIGH_DIST_KEY = 'tws_highway_racer_high_distance';
const SOUND_PREF_KEY = 'tws_highway_racer_sound_enabled';

export class GameState {
  constructor() {
    this.currentState = STATES.MENU;
    
    // Gameplay metrics
    this.score = 0;
    this.distance = 0; // in meters
    this.speedKmh = 0;
    this.nearMisses = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.timeElapsed = 0;

    // Progressive Difficulty & Level System
    this.difficultyLevel = 1;
    this.levelThresholds = [0, 450, 1100, 2000, 3200]; // Meters to reach Level 1, 2, 3, 4, 5

    // Drift & Wrong Way Bonus Tracking
    this.driftScore = 0;
    this.wrongWayScore = 0;
    
    // Persistent metrics
    this.highScore = this.loadNumber(HIGH_SCORE_KEY, 0);
    this.highDistance = this.loadNumber(HIGH_DIST_KEY, 0);
    this.soundEnabled = this.loadBoolean(SOUND_PREF_KEY, true);
    
    this.listeners = new Map();
  }

  loadNumber(key, defaultValue) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? Math.max(0, parseInt(val, 10) || 0) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  loadBoolean(key, defaultValue) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? val === 'true' : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  saveHighScore(score, distance) {
    try {
      if (score > this.highScore) {
        this.highScore = Math.floor(score);
        localStorage.setItem(HIGH_SCORE_KEY, this.highScore.toString());
      }
      if (distance > this.highDistance) {
        this.highDistance = Math.floor(distance);
        localStorage.setItem(HIGH_DIST_KEY, this.highDistance.toString());
      }
    } catch (e) {
      console.warn('Failed to save high score to localStorage:', e);
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = !!enabled;
    try {
      localStorage.setItem(SOUND_PREF_KEY, this.soundEnabled.toString());
    } catch (e) {}
    this.emit('soundToggled', this.soundEnabled);
  }

  toggleSound() {
    this.setSoundEnabled(!this.soundEnabled);
    return this.soundEnabled;
  }

  setState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;
    this.emit('stateChanged', { from: oldState, to: newState });
  }

  is(state) {
    return this.currentState === state;
  }

  isPlaying() {
    return this.currentState === STATES.PLAYING;
  }

  isPaused() {
    return this.currentState === STATES.PAUSED;
  }

  isGameOver() {
    return this.currentState === STATES.GAMEOVER;
  }

  isMenu() {
    return this.currentState === STATES.MENU;
  }

  reset() {
    this.score = 0;
    this.distance = 0;
    this.speedKmh = 0;
    this.nearMisses = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.timeElapsed = 0;
    this.difficultyLevel = 1;
    this.driftScore = 0;
    this.wrongWayScore = 0;
    this.emit('reset');
  }

  addDistance(deltaMeters) {
    if (!this.isPlaying()) return;
    this.distance += deltaMeters;
    
    // Base score from distance + speed bonus
    let pointGain = deltaMeters * 0.8;
    if (this.speedKmh > 120) {
      pointGain += (this.speedKmh - 120) * 0.05 * deltaMeters;
    }
    this.score += pointGain * this.combo;

    // Check level progression
    const prevLevel = this.difficultyLevel;
    let newLevel = 1;
    for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
      if (this.distance >= this.levelThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }

    if (newLevel > prevLevel) {
      this.difficultyLevel = newLevel;
      this.score += 500 * newLevel; // Level up bonus!
      this.emit('levelUp', { level: newLevel, distance: Math.round(this.distance) });
    }
  }

  addNearMiss(bonusPoints = 250) {
    if (!this.isPlaying()) return;
    this.nearMisses++;
    this.combo = Math.min(this.combo + 1, 8); // Max 8x combo
    this.comboTimer = 3.8;
    const earned = bonusPoints * this.combo;
    this.score += earned;
    this.emit('nearMiss', { nearMisses: this.nearMisses, combo: this.combo, earned });
  }

  addWrongWayBonus(dt) {
    if (!this.isPlaying()) return;
    const pts = Math.round(Math.max(10, this.speedKmh * 0.6) * 12 * dt);
    this.wrongWayScore += pts;
    this.score += pts;
  }

  addDriftBonus(dt) {
    if (!this.isPlaying()) return;
    const pts = Math.round(Math.max(10, this.speedKmh * 0.4) * 8 * dt);
    this.driftScore += pts;
    this.score += pts;
  }

  update(delta) {
    if (!this.isPlaying()) return;
    this.timeElapsed += delta;

    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.emit('comboReset');
      }
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in GameState listener for '${event}':`, e);
        }
      }
    }
  }
}
