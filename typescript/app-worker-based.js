const $ = q => document.querySelector(q);
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const gameCanvas = $('#game');
const gameContainer = $('#game-container');
const canvasContainer = $('div.canvas-container');

const audioElem = $('#audio-elem');

const btnStart = $('#btn-start');
const btnRestart = $('#btn-restart');
const btnResume = $('#btn-resume');
const btnPause = $('#btn-pause');
const btnContinue = $('#btn-continue');
const pausedContainer = $('#paused');

const btnSetting = $('#btn-setting');
const btnSettingSave = $('#btn-setting-save');
const settingsContainer = $('#settings-container');

const soundToggle = $('input#sound-toggle');
const bulletTimeToggleInput = $('input#bullet-time-toggle')
const flashTextToggleInput = $('input#flash-text-toggle')

const worker = new Worker('typescript/worker.js');
let offscreen = null;

// keyboard
window.addEventListener('keydown', e => {
  worker.postMessage({type: 'keydown', code: e.code});
});
window.addEventListener('keyup', e => {
  worker.postMessage({type: 'keyup', code: e.code});
});

// mouse (for paddle movement)
window.addEventListener('mousemove', e => {
  worker.postMessage({
    type: GAME_EVENTS.MOUSE_MOVE,
    payload: {
      x: e.movementX,
      y: e.movementY
    }
  })
});

// touch
window.addEventListener('touchmove', e => {
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }

  const t = e.touches[0];
  const r = gameCanvas.getBoundingClientRect();

  worker.postMessage({
    type: GAME_EVENTS.TOUCH_MOVE,
    payload: {
      x: t.clientX - r.left,
    }
  });
});

btnContinue.addEventListener('click', () => {
  worker.postMessage({
    type: 'btn-continue-click',
  });
})

btnStart.addEventListener('click', () => {
  offscreen = gameCanvas.transferControlToOffscreen();

  worker.postMessage({
    type: GAME_EVENTS.INIT,
    payload: {
      canvas: offscreen,
      width: canvasContainer.clientWidth,
      height: canvasContainer.clientHeight,
      screenHeight: canvasContainer.offsetHeight || window.innerHeight,
      isMobile,
      config: {
        isSoundEnabled: localStorage.getItem('isSoundEnabled') ? localStorage.getItem('isSoundEnabled') === 'true' : true,
        isBulletTimeEnabled: localStorage.getItem('isBulletTimeEnabled') ? localStorage.getItem('isBulletTimeEnabled') === 'true' : true,
        isFlashTextEnabled: localStorage.getItem('isFlashTextEnabled') ? localStorage.getItem('isFlashTextEnabled') === 'true' : true,
      }
    }
  }, [offscreen]);
})
btnPause.addEventListener('click', () => worker.postMessage({type: 'pause'}));
btnResume.addEventListener('click', () => worker.postMessage({type: 'resume'}));


const GAME_EVENTS = {
  INIT: 'INIT',
  READY: 'INIT',

  /* Render Requests to DOM */
  BUILD_SIDE_BAR: 'BUILD_SIDE_BAR',

  /* Setting Menu */
  SHOW_SETTINGS_MENU: 'SHOW_SETTINGS_MENU',
  UPDATE_SOUND_PREFERENCES: 'UPDATE_SOUND_PREFERENCES',
  SET_GAME_BACKGROUND_MUSIC: 'SET_GAME_BACKGROUND_MUSIC',
  UPDATE_SLOW_MO_PREFERENCES: 'UPDATE_SLOW_MO_PREFERENCES',
  UPDATE_FLASH_TEXT_PREFERENCES: 'UPDATE_FLASH_TEXT_PREFERENCES',
  HIDE_SETTINGS_MENU: 'HIDE_SETTINGS_MENU',

  /* GameOver Screen Controls */
  SHOW_GAME_OVER_MENU: 'SHOW_GAME_OVER_MENU',
  HIDE_GAME_OVER_MENU: 'HIDE_GAME_OVER_MENU',

  /* Pause Screen Controls */
  SHOW_PAUSE_MENU: 'SHOW_PAUSE_MENU',
  HIDE_PAUSE_MENU: 'HIDE_PAUSE_MENU',

  SET_POINTER_LOCK: 'SET_POINTER_LOCK',
  RESET_POINTER_LOCK: 'RESET_POINTER_LOCK',

  RESTART_GAME_FROM_BEGINNING: 'RESTART_GAME_FROM_BEGINNING',

  SYNC_HUD: 'SYNC_HUD',
  SYNC_SIDE_BAR: 'SYNC_SIDE_BAR',

  SET_SHAKE: 'SET_SHAKE',
  REMOVE_SHAKE: 'REMOVE_SHAKE',

  SET_HIT: 'SET_HIT',
  REMOVE_HIT: 'REMOVE_HIT',

  SHOW_FLASH_TEXT: 'SHOW_FLASH_TEXT',
  HIDE_FLASH_TEXT: 'HIDE_FLASH_TEXT',

  MOUSE_MOVE: 'MOUSE_MOVE',
  CLICK_ON_CANVAS: 'CLICK_ON_CANVAS',

  FLIP_POWER_UP: 'FLIP_POWER_UP',
  TOUCH_MOVE: 'TOUCH_MOVE',
}

const flashBox = $('#flash');

worker.onmessage = ({data}) => {
  switch (data.type) {
    case GAME_EVENTS.READY: {
      $('#start').classList.remove('show')

      gameContainer.addEventListener('click', () => {
        if (!document.pointerLockElement && !isMobile) gameCanvas.requestPointerLock();
        worker.postMessage({
          type: GAME_EVENTS.CLICK_ON_CANVAS,
        })
      });

      break;
    }

    case GAME_EVENTS.SET_GAME_BACKGROUND_MUSIC: {
      audioElem.src = data.payload.src
      break;
    }

    case GAME_EVENTS.SHOW_FLASH_TEXT: {
      flashBox.textContent = data.payload.textContent;
      flashBox.style.opacity = '1';
      flashBox.style.color = data.payload.color;
      flashBox.style.textShadow = `0 0 4px ${data.payload.color}`;
      break;
    }

    case GAME_EVENTS.HIDE_FLASH_TEXT: {
      flashBox.style.opacity = '0';
      break;
    }

    case GAME_EVENTS.FLIP_POWER_UP: {
      gameCanvas.style.transform = data.payload.transformStyle;
      break;
    }
  }
}