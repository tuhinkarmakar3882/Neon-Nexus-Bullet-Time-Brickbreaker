const $ = q => document.querySelector(q);
const rand = (a, b) => Math.random() * (b - a) + a;
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const worker = new Worker('typescript/worker.js');

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
const settingsContainer = $('#settings-container');

const btnSetting = $('#btn-setting');

btnSetting.addEventListener('click', (e) => {
  e.preventDefault()
  e.stopPropagation()

  settingsContainer.classList.add('show')

  worker.postMessage({
    type: GAME_EVENTS.SHOW_SETTINGS_MENU
  })
})


const btnSettingSave = $('#btn-setting-save');


const soundToggle = $('input#sound-toggle');
const bulletTimeToggleInput = $('input#bullet-time-toggle')
const flashTextToggleInput = $('input#flash-text-toggle')

const scoreEl = $('#score');
const livesEl = $('#lives');
const levelEl = $('#level');
const remainEl = $('#remaining-bricks-count');

soundToggle.addEventListener('click', (e) => {
  e.stopPropagation()
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
})
bulletTimeToggleInput.addEventListener('click', (e) => {
  e.stopPropagation()
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
})
flashTextToggleInput.addEventListener('click', (e) => {
  e.stopPropagation()
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
})


btnSettingSave.addEventListener('click', (e) => {
  e.preventDefault()
  e.stopPropagation()

  localStorage.setItem('isSoundEnabled', soundToggle.checked)
  localStorage.setItem('isFlashTextEnabled', flashTextToggleInput.checked)
  localStorage.setItem('isBulletTimeEnabled', bulletTimeToggleInput.checked)

  audioElem.muted = !soundToggle.checked

  worker.postMessage({
    type: GAME_EVENTS.HIDE_SETTINGS_MENU,
    payload: {
      isSoundEnabled: soundToggle.checked,
      isFlashTextEnabled: flashTextToggleInput.checked,
      isBulletTimeEnabled: bulletTimeToggleInput.checked,
    }
  })
  settingsContainer.classList.remove('show');
})

let offscreen = null;

// keyboard
window.addEventListener('keydown', e => {
  worker.postMessage({type: 'keydown', code: e.code});
});
window.addEventListener('resize', e => {
  worker.postMessage({
    type: GAME_EVENTS.RESIZE, payload: {
      height: $('div.canvas-container').clientHeight,
      width: $('div.canvas-container').clientWidth,
    }
  });
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
  $('#gameover').classList.remove('show');

  worker.postMessage({
    type: GAME_EVENTS.CONTINUE_GAME,
  });
})

btnRestart.addEventListener('click', () => {
  worker.postMessage({
    type: GAME_EVENTS.RESTART_GAME_FROM_BEGINNING,
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
btnPause.addEventListener('click', () => {
  worker.postMessage({type: GAME_EVENTS.SHOW_PAUSE_MENU})
  pausedContainer.classList.add('show');
});
btnResume.addEventListener('click', () => {
  worker.postMessage({type: GAME_EVENTS.HIDE_PAUSE_MENU})
  pausedContainer.classList.remove('show');
});


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

  /* Level Complete Screen Controls */
  SHOW_LEVEL_COMPLETE_MODAL: 'SHOW_LEVEL_COMPLETE_MODAL',
  HIDE_LEVEL_COMPLETE_MODAL: 'HIDE_LEVEL_COMPLETE_MODAL',

  /* GameOver Screen Controls */
  SHOW_GAME_OVER_MENU: 'SHOW_GAME_OVER_MENU',
  HIDE_GAME_OVER_MENU: 'HIDE_GAME_OVER_MENU',
  CONTINUE_GAME: 'CONTINUE_GAME',

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
  SHOW_LEVEL_COMPLETE_MODAL: 'SHOW_LEVEL_COMPLETE_MODAL'

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

    case GAME_EVENTS.SYNC_HUD: {
      scoreEl.textContent = data.payload.score;
      livesEl.textContent = data.payload.lives;
      levelEl.textContent = data.payload.level;
      remainEl.textContent = data.payload.left;
      break;
    }

    case GAME_EVENTS.BUILD_SIDE_BAR: {
      const sb = $('.sidebar > .sidebar-powerups');

      sb.innerHTML = '<h3>Power‑Ups</h3>';

      data.payload.powers.forEach(k => {
        const row = document.createElement('div');
        row.className = 'power';
        row.id = `power-ups-${k}-indicator`
        row.innerHTML = `<span class="color" style="background:${data.payload.config.COLORS[k]}"></span><span>${k}</span>`;
        sb.appendChild(row);
      });
      break
    }

    case GAME_EVENTS.SYNC_SIDE_BAR: {
      data.payload.powers.forEach(k => {
        const powerUpElem = $(`#power-ups-${k}-indicator`)
        data.payload.activePowers.has(k) ? powerUpElem.classList.add('active') : powerUpElem.classList.remove(
          'active')
      });
      break;
    }

    case GAME_EVENTS.RESTART_GAME_FROM_BEGINNING: {
      location.reload()
      break;
    }

    case GAME_EVENTS.SHOW_GAME_OVER_MENU: {
      $('#gameover').classList.add('show');

      if (!data.payload.canContinue) {
        btnContinue.style.display = 'none'
      }

      $('#btn-continue-text').textContent = data.payload.buttonText
      $('#game-over-text').textContent = data.payload.gameOverMessage

      document.exitPointerLock();

      break;
    }

    case GAME_EVENTS.HIDE_GAME_OVER_MENU: {
      console.log('Main -> Continuing...')
      $('#gameover').classList.remove('show');

      break;
    }

    case GAME_EVENTS.RESET_POINTER_LOCK: {
      document.exitPointerLock();

      break;
    }

    case GAME_EVENTS.SET_POINTER_LOCK: {
      if (!document.pointerLockElement && !isMobile) {
        gameCanvas.requestPointerLock();
      }
      break;
    }

    case GAME_EVENTS.SHOW_LEVEL_COMPLETE_MODAL: {
      $('#lvl-text').textContent = data.payload.lvlText;
      $('#lvlup-text').textContent = data.payload.lvlUpText
      $('#lvlup').classList.add('show');

      break;
    }
    case GAME_EVENTS.HIDE_LEVEL_COMPLETE_MODAL: {
      $('#lvlup').classList.remove('show');

      break;
    }
  }
}

