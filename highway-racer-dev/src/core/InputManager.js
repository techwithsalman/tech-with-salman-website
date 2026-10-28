// Highway Racer 3D - Universal Input Manager (Keyboard, Touch, Gamepad)

export class InputManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;

    // Smoothed analog values (-1 to 1 for steering, 0 to 1 for pedals)
    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.handbrake = 0;

    // Raw digital states
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      pause: false
    };

    // Virtual / Mobile inputs
    this.touch = {
      left: false,
      right: false,
      throttle: false,
      brake: false
    };

    // Action triggers (one-shot events)
    this.onPauseRequested = null;
    this.onRestartRequested = null;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Reset inputs on blur or tab change
    window.addEventListener('blur', () => this.resetInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetInputs();
    });
  }

  handleKeyDown(e) {
    // Prevent default scroll actions for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.space = true;
        break;
      case 'Escape':
      case 'KeyP':
        if (this.onPauseRequested) this.onPauseRequested();
        break;
      case 'KeyR':
        if (this.onRestartRequested) this.onRestartRequested();
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.space = false;
        break;
    }
  }

  setTouchInput(action, active) {
    if (this.touch.hasOwnProperty(action)) {
      this.touch[action] = !!active;
    }
  }

  resetInputs() {
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.space = false;
    this.touch.left = false;
    this.touch.right = false;
    this.touch.throttle = false;
    this.touch.brake = false;
    this.throttle = 0;
    this.brake = 0;
    this.steer = 0;
    this.handbrake = 0;
  }

  update(delta) {
    // Target inputs
    const targetThrottle = (this.keys.up || this.touch.throttle) ? 1.0 : 0.0;
    const targetBrake = (this.keys.down || this.touch.brake) ? 1.0 : 0.0;
    
    let targetSteer = 0.0;
    if (this.keys.left || this.touch.left) targetSteer -= 1.0;
    if (this.keys.right || this.touch.right) targetSteer += 1.0;

    const targetHandbrake = this.keys.space ? 1.0 : 0.0;

    // Smooth responsive interpolation
    const steerSmoothing = targetSteer === 0 ? 12.0 : 9.0;
    this.steer += (targetSteer - this.steer) * Math.min(1.0, delta * steerSmoothing);

    const pedalSmoothing = 14.0;
    this.throttle += (targetThrottle - this.throttle) * Math.min(1.0, delta * pedalSmoothing);
    this.brake += (targetBrake - this.brake) * Math.min(1.0, delta * pedalSmoothing);
    this.handbrake += (targetHandbrake - this.handbrake) * Math.min(1.0, delta * 20.0);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
