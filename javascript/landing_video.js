const landingVideo = document.querySelector("#landingVideo");

if (landingVideo) {
  landingVideo.addEventListener("ended", function() {
    console.log('ended');
    setTimeout(function(){
      landingVideo.play();
    }, 3000);
  }, false);
}