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
    // Target inputs from keyboard & touch
    let targetThrottle = (this.keys.up || this.touch.throttle) ? 1.0 : 0.0;
    let targetBrake = (this.keys.down || this.touch.brake) ? 1.0 : 0.0;
    
    // Steering: Left input moves car LEFT (+X in 3D world, screen left).
    //           Right input moves car RIGHT (-X in 3D world, screen right).
    let targetSteer = 0.0;
    if (this.keys.left || this.touch.left) targetSteer += 1.0;
    if (this.keys.right || this.touch.right) targetSteer -= 1.0;

    let targetHandbrake = this.keys.space ? 1.0 : 0.0;

    // Gamepad polling
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      try {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
          const gp = gamepads[i];
          if (!gp) continue;

          // Left analog stick horizontal (axis 0: -1.0 is left, +1.0 is right)
          if (gp.axes && gp.axes.length > 0) {
            const axisX = gp.axes[0];
            if (Math.abs(axisX) > 0.15) {
              // stick left (axisX < 0) -> +targetSteer (left)
              // stick right (axisX > 0) -> -targetSteer (right)
              targetSteer -= axisX;
            }
          }

          // D-Pad Left (button 14) / D-Pad Right (button 15)
          if (gp.buttons) {
            if (gp.buttons[14]?.pressed) targetSteer += 1.0;
            if (gp.buttons[15]?.pressed) targetSteer -= 1.0;

            // Gas: Right Trigger (button 7), A (button 0), or D-Pad Up (button 12)
            if (gp.buttons[7]?.value > 0.1) {
              targetThrottle = Math.max(targetThrottle, gp.buttons[7].value);
            } else if (gp.buttons[0]?.pressed || gp.buttons[12]?.pressed) {
              targetThrottle = Math.max(targetThrottle, 1.0);
            }

            // Brake: Left Trigger (button 6), B (button 1), X (button 2), or D-Pad Down (button 13)
            if (gp.buttons[6]?.value > 0.1) {
              targetBrake = Math.max(targetBrake, gp.buttons[6].value);
            } else if (gp.buttons[1]?.pressed || gp.buttons[2]?.pressed || gp.buttons[13]?.pressed) {
              targetBrake = Math.max(targetBrake, 1.0);
            }

            // Handbrake: Right Bumper (button 5)
            if (gp.buttons[5]?.pressed) {
              targetHandbrake = 1.0;
            }
          }
        }
      } catch (err) {
        // Gamepad API graceful fallback
      }
    }

    targetSteer = THREE_Math_clamp(targetSteer, -1.0, 1.0);

    // Smooth responsive interpolation
    const steerSmoothing = targetSteer === 0 ? 14.0 : 10.0;
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

function THREE_Math_clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
