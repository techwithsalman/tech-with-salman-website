// Highway Racer 3D - Main Game Loop & Lifecycle Orchestrator

import { SceneManager } from './graphics/SceneManager.js';
import { CameraController } from './graphics/CameraController.js';
import { HighwayEnvironment } from './world/HighwayEnvironment.js';
import { PlayerCar } from './entities/PlayerCar.js';
import { TrafficManager } from './entities/TrafficManager.js';
import { CollisionSystem } from './physics/CollisionSystem.js';
import { InputManager } from './core/InputManager.js';
import { AudioSystem } from './core/AudioSystem.js';
import { GameState, STATES } from './core/GameState.js';
import { HUD } from './ui/HUD.js';
import { loadAssets } from './graphics/AssetLibrary.js';

class GameApp {
  constructor(assets) {
    this.assetsReady = true;
    this.canvas = document.getElementById('game-canvas');
    this.uiContainer = document.getElementById('ui-container');

    // 1. Core Systems
    this.gameState = new GameState();
    this.audio = new AudioSystem(this.gameState);
    this.input = new InputManager();

    // 2. Graphics & Scene
    this.sceneManager = new SceneManager(this.canvas, assets);
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.environment = new HighwayEnvironment(this.sceneManager.scene, assets);
    this.playerCar = new PlayerCar(this.sceneManager.scene, assets.car);
    this.trafficManager = new TrafficManager(this.sceneManager.scene, this.gameState, assets.traffic, this.environment.spline);

    // 3. Physics & UI
    this.collisionSystem = new CollisionSystem(this.gameState, this.audio, this.cameraController);
    this.hud = new HUD(this.uiContainer, this.gameState, this.input, this.audio);
    this.hud.onSwitchCamera = () => this.cameraController.switchMode(this.playerCar.hasInterior);
    this.hud.onGearToggle = () => this.playerCar.toggleGear();
    this.hud.onToggleHandling = () => this.playerCar.toggleDriveMode();
    this.cameraController.onModeChanged = name => this.hud.setCameraMode(name);
    this.input.onRestartRequested = () => {
      if (!this.gameState.isMenu()) this.startNewRace();
    };
    this.input.onGearToggleRequested = () => this.playerCar.toggleGear();
    this.gameState.on('stateChanged', ({to}) => {
      if (to !== STATES.PLAYING) {
        this.input.resetInputs();
        this.audio.updateEngine(0, 0, false, false);
      }
    });

    // Timing
    this.lastTime = performance.now();
    this.isRunning = false;

    this.init();
  }

  init() {
    this.bindHUDCallbacks();
    this.bindGlobalKeys();

    // Start in Menu state
    this.cameraController.setMenuMode();
    this.cameraController.reset(this.playerCar.position);
    this.gameState.setState(STATES.MENU);

    // Start requestAnimationFrame loop
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  bindHUDCallbacks() {
    this.hud.onStartGame = () => {
      this.audio.ensureContext();
      this.startNewRace();
    };

    this.hud.onResumeGame = () => {
      this.gameState.setState(STATES.PLAYING);
    };

    this.hud.onRestartGame = () => {
      this.startNewRace();
    };

    this.hud.onMainMenu = () => {
      this.audio.updateEngine(0, 0, false, false);
      this.playerCar.reset();
      this.environment.reset();
      this.trafficManager.setSpline(this.environment.spline);
      this.trafficManager.reset();
      this.sceneManager.update(this.playerCar.position.z, this.playerCar.position.x);
      this.cameraController.setMenuMode();
      this.cameraController.reset(this.playerCar.position, this.playerCar.heading);
      this.gameState.setState(STATES.MENU);
    };
  }

  bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (e.repeat) return;
        if (this.gameState.isPlaying()) {
          this.gameState.setState(STATES.PAUSED);
        } else if (this.gameState.isPaused()) {
          this.gameState.setState(STATES.PLAYING);
        }
      }
      if (e.code === 'KeyC' && !e.repeat && !this.gameState.isMenu()) {
        this.hud.onSwitchCamera();
      }
    });
  }

  startNewRace() {
    this.gameState.reset();
    this.input.resetInputs();
    this.hud.maxRecordedSpeed = 0;
    this.environment.reset();
    this.trafficManager.setSpline(this.environment.spline);
    this.playerCar.reset();
    this.sceneManager.update(this.playerCar.position.z, this.playerCar.position.x);
    this.trafficManager.reset(true);
    this.cameraController.reset(this.playerCar.position, this.playerCar.heading);
    this.gameState.setState(STATES.PLAYING);
  }

  loop(currentTime) {
    if (!this.isRunning) return;
    requestAnimationFrame((t) => this.loop(t));

    // Calculate clamped delta time (prevent physics instability on tab inactive/frame drops)
    const rawDelta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const delta = Math.min(rawDelta, 0.08);

    const isPlaying = this.gameState.isPlaying();
    const isMenu = this.gameState.isMenu();
    const isGameOver = this.gameState.isGameOver();

    if (isMenu) {
      // Orbit camera around showcase car in start menu
      this.cameraController.updateMenu(this.playerCar.position, delta);
      this.audio.updateEngine(0, 0, false, false);
    } else if (isPlaying) {
      // 1. Advance game time, inputs & combo timers
      this.input.update(delta);
      // Bounded physics steps keep fast traffic collisions reliable at low frame rates.
      const steps = Math.max(1, Math.ceil(delta / (1 / 120)));
      const step = delta / steps;
      let carResult;
      for (let i = 0; i < steps && this.gameState.isPlaying(); i++) {
        this.gameState.update(step);
        carResult = this.playerCar.update(step, this.input, this.environment.spline);
        this.gameState.speedKmh = carResult.speedKmh;
        this.gameState.addDistance(carResult.distanceDelta);
        if (carResult.isSkidding) {
          this.gameState.addDriftBonus(step);
        }
        this.trafficManager.update(this.playerCar.currentS, step);
        this.collisionSystem.checkCollisions(this.playerCar, this.trafficManager, step);
      }

      // 3. Procedural world recycling ahead of player & sunlight follow
      this.environment.update(this.playerCar.currentS, this.gameState.difficultyLevel);
      this.sceneManager.update(this.playerCar.position.z, this.playerCar.position.x);

      // 6. Dynamic chase camera
      this.cameraController.updateChase(
        this.playerCar.position,
        this.playerCar.steerAngle,
        this.playerCar.speedKmh,
        delta,
        this.playerCar,
        this.trafficManager.activeVehicles
      );

      // 7. Dynamic Web Audio effects (V8 engine pitch, wind rush, tire screech)
      this.audio.updateEngine(
        this.gameState.isPlaying() ? this.playerCar.speedKmh : 0,
        this.input.throttle,
        carResult?.isBraking || false,
        carResult?.isSkidding || false
      );
    } else if (isGameOver) {
      // Camera shake settles, engine cuts out
      this.cameraController.updateChase(this.playerCar.position, 0, 0, delta, this.playerCar, this.trafficManager.activeVehicles);
      this.audio.updateEngine(0, 0, false, false);
    }

    // Update HUD gauges & telemetry
    this.hud.update(this.playerCar.speedKmh, this.playerCar);
    this.trafficManager.updateVisuals(this.sceneManager.camera);

    // Render WebGL frame
    this.sceneManager.render();
  }
}

// Instantiate game once DOM is loaded
window.addEventListener('DOMContentLoaded', async () => {
  const overlay = document.getElementById('loading-overlay');
  const status = document.getElementById('loading-status');
  try {
    const assets = await loadAssets((done, total) => {
      status.textContent = `Preparing car & environment · ${done} / ${total}`;
    });
    window.highwayRacerGame = new GameApp(assets);
    overlay.remove();
  } catch (error) {
    console.error('Game asset initialization failed:', error);
    status.textContent = 'An asset could not be loaded. Reload to retry.';
    document.getElementById('loading-retry').hidden = false;
  }
});
