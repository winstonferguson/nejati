
export default delayedLoopLandingVideo = (delay) => {
  const delayTime = delay || 3000;
  const landingVideo = document.querySelector("#landingVideo");  

  if (!landingVideo) return;

  landingVideo.addEventListener("ended", function () {
    setTimeout(function () {
      landingVideo.play();
    }, delayTime);
  }, false);
}