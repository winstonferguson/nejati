
// sticky positioned elements that stick to bottom of the viewport 
const stickToBottom = () => {
  elements = document.querySelectorAll('.stick-to-bottom');

  if (!elements) return;

  elements.forEach(el => {
    el.style.top = `${window.innerHeight - el.clientHeight}px`;   
  });
}

export { stickToBottom }