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

class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.uiContainer = document.getElementById('ui-container');

    // 1. Core Systems
    this.gameState = new GameState();
    this.audio = new AudioSystem(this.gameState);
    this.input = new InputManager();

    // 2. Graphics & Scene
    this.sceneManager = new SceneManager(this.canvas);
    this.cameraController = new CameraController(this.sceneManager.camera);
    this.environment = new HighwayEnvironment(this.sceneManager.scene);
    this.playerCar = new PlayerCar(this.sceneManager.scene);
    this.trafficManager = new TrafficManager(this.sceneManager.scene, this.gameState);

    // 3. Physics & UI
    this.collisionSystem = new CollisionSystem(this.gameState, this.audio, this.cameraController);
    this.hud = new HUD(this.uiContainer, this.gameState, this.input, this.audio);

    // Timing
    this.lastTime = performance.now();
    this.isRunning = false;

    this.init();
  }

  init() {
    this.bindHUDCallbacks();
    this.bindGlobalKeys();

    // Window resize handling
    window.addEventListener('resize', () => {
      this.sceneManager.onResize();
    });

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
      this.trafficManager.reset();
      this.environment.reset();
      this.cameraController.setMenuMode();
      this.cameraController.reset(this.playerCar.position);
      this.gameState.setState(STATES.MENU);
    };
  }

  bindGlobalKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.gameState.isPlaying()) {
          this.gameState.setState(STATES.PAUSED);
        } else if (this.gameState.isPaused()) {
          this.gameState.setState(STATES.PLAYING);
        }
      }
    });
  }

  startNewRace() {
    this.gameState.reset();
    this.environment.reset();
    this.playerCar.reset();
    this.trafficManager.reset();
    this.cameraController.reset(this.playerCar.position);
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
      this.gameState.update(delta);

      // 2. Update player vehicle physics & controls
      const carResult = this.playerCar.update(delta, this.input);
      this.gameState.speedKmh = carResult.speedKmh;
      this.gameState.addDistance(carResult.distanceDelta);

      // 3. Procedural world recycling ahead of player
      this.environment.update(this.playerCar.position.z);

      // 4. AI Traffic flow & lifecycle
      this.trafficManager.update(this.playerCar.position.z, delta);

      // 5. Collision & Near-Miss check
      this.collisionSystem.checkCollisions(this.playerCar, this.trafficManager, delta);

      // 6. Dynamic chase camera
      this.cameraController.updateChase(
        this.playerCar.position,
        this.playerCar.steerAngle,
        this.playerCar.speedKmh,
        delta
      );

      // 7. Dynamic Web Audio effects (V8 engine pitch, wind rush, tire screech)
      this.audio.updateEngine(
        this.playerCar.speedKmh,
        this.input.throttle,
        carResult.isBraking,
        carResult.isSkidding
      );
    } else if (isGameOver) {
      // Camera shake settles, engine cuts out
      this.cameraController.updateChase(this.playerCar.position, 0, 0, delta);
      this.audio.updateEngine(0, 0, false, false);
    }

    // Update HUD gauges & telemetry
    this.hud.update(this.playerCar.speedKmh);

    // Render WebGL frame
    this.sceneManager.render();
  }
}

// Instantiate game once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.highwayRacerGame = new GameApp();
});
