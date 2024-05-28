import initDialog from './init_dialog.js';
import initCarousels from './init_carousels.js';
import formRedirect from './form_redirect.js';

import { isHome, isSuccess, overlayHeader, stickToBottom } from './utilities.js';


window.onload = () => {
  initCarousels();
  initDialog();
  stickToBottom();
  // formRedirect();

  if (isHome) overlayHeader();
}

window.resize = () => {
  initCarousels();
  stickToBottom();
}