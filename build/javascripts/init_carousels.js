import Glide, { Autoplay, Breakpoints, Controls, Keyboard, Swipe } from '@glidejs/glide/dist/glide.modular.esm';


export default function initCarousels() {
  let glideElements = document.querySelectorAll('.glide');



  if (glideElements.length < 1) return;

  for (const el of glideElements) {
    const autoplay = el.dataset.autoplay == 'true'

    if (autoplay) {
      new Glide(el, options(autoplay)).mount({ Autoplay, Breakpoints, Keyboard, Swipe })
    } else {
      new Glide(el, options(autoplay)).mount({ Breakpoints, Controls, Keyboard, Swipe })
    }
    
  }
}

const options = (autoplay = false) => {
  const autoplayOptions = {
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

  const controlOptions = {
    type: 'carousel',
    focusAt: 'center',
    startAt: 0,
    peek: 0,
    perView: 6,
    gap: 30,
    hoverpause: true,
    breakpoints: {
      960: {
        perView: 3,
        peek: 0,
        focusAt: 0,
        gap: 0
      },
      768: {
        perView: 1,
        peek: 0,
        focusAt: 0,
        gap: 0
      }
    }
  }

  return autoplay ? autoplayOptions : controlOptions;
}