import initDialog from './init_dialog.js';
import initCarousels from './init_carousels.js';
import { isHome, overlayHeader, stickToBottom } from './utilities.js';


window.onload = () => {
  initCarousels();
  initDialog();
  stickToBottom();

  if (isHome) overlayHeader();
}

window.resize = () => {
  initCarousels();
  stickToBottom();
}