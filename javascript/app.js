import './dialog.js';
import './landing_video.js';
import Glide, { Autoplay, Breakpoints, Controls, Keyboard, Swipe } from '@glidejs/glide/dist/glide.modular.esm';



window.onload = () => {
  const hasGlide = document.querySelector(".glide") || false;

  if (!hasGlide) return;
  
  const indexOptions = {
    type: 'carousel',
    focusAt: 'center',
    startAt: 0,
    peek: 0,
    perView: 6,
    gap: 150,
    autoplay: 2000,
    breakpoints: {
      960: {
        perView: 1,
        peek: 0,
        focusAt: 0,
        gap: 0
      }
    },
  }

  const ageingOptions = {
    type: 'carousel',
    focusAt: 'center',
    startAt: 0,
    peek: 0,
    perView: 4,
    gap: 30,
    hoverpause: true,
    breakpoints: {
      960: {
        perView: 1,
        peek: 0,
        focusAt: 0,
        gap: 0
      }
    }
  }

  const options = isIndex ? indexOptions : ageingOptions;

  let glide = new Glide('.glide', options).mount({ Autoplay, Breakpoints, Controls, Keyboard, Swipe })
}

import WixData from './wix_data.js';
import { isIndex } from './utilities.js';

if (isIndex) delayedLoopLandingVideo();

const stickyModels = () => {
  models = document.querySelectorAll('.image__feature--model');

  models.forEach(model => {
    const style = getComputedStyle(model);
    const isSticky = style.getPropertyValue('position') === 'sticky';

    if (isSticky) model.style.top = `${window.innerHeight - model.clientHeight}px`;
  });
}

const populateWixData = async () => {
  const wix = new WixData();
  await wix.fetchDataItems();
  wix.updateCollections();

  stickyModels();
}



const indexBody = () => {
  const isHomepage = document.querySelector('body.index');

  if (isHomepage) {
    const header = document.querySelector('header');
    const headerHeight = getComputedStyle(header).getPropertyValue('height');

    const hero = document.querySelector('.hero');
    hero.style.marginTop = `-${headerHeight}`;
  }
}

indexBody();

populateWixData();

window.addEventListener('resize', stickyModels);