let isHome = (window.location.href.split('/').pop().length == 0);

// sticky positioned elements that stick to bottom of the viewport 
const stickToBottom = () => {
  elements = document.querySelectorAll('.stick-to-bottom');

  if (!elements) return;

  elements.forEach(el => {
    el.style.top = `${window.innerHeight - el.clientHeight}px`;
  });
}

const overlayHeader = () => {
  const header = document.querySelector('header');
  const headerHeight = getComputedStyle(header).getPropertyValue('height');
  const firstChild = document.querySelector('main').firstElementChild;

  firstChild.style.marginTop = `-${headerHeight}`;
  header.classList.add('overlay');
}

export {
  isHome,
  overlayHeader,
  stickToBottom
}