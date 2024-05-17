import initDialog from './init_dialog.js';
import initCarousels from './init_carousels.js';
import { isHome, overlayHeader, stickToBottom } from './utilities.js';


import Glide, { Autoplay, Breakpoints, Controls, Keyboard, Swipe } from '@glidejs/glide/dist/glide.modular.esm';


window.onload = () => {
  initCarousels();
  initDialog();
  stickToBottom();

  if (isHome) overlayHeader();
}

window.addEventListener('resize', stickToBottom);