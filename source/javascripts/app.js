import './dialog.js';

import { stickToBottom } from './stick-to-bottom.js';

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

  

  const options = (window.location.href.split('/').pop().length == 0)  ? indexOptions : ageingOptions;

  console.log(options);

  let glide = new Glide('.glide', options).mount({ Autoplay, Breakpoints, Controls, Keyboard, Swipe })

  stickToBottom();
}



const indexBody = () => {
  const isHomepage = document.querySelector('body.index');

  if (isHomepage) {
    const header = document.querySelector('header');
    const headerHeight = getComputedStyle(header).getPropertyValue('height');

    const hero = document.querySelector('.hero');

    if (hero) hero.style.marginTop = `-${headerHeight}`;
  }
}

indexBody();


window.addEventListener('resize', stickToBottom);