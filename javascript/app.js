import './dialog.js';
import './landing_video.js';
import WixData from './wix_data.js';
import { isIndex } from './utilities.js';

if (isIndex) delayedLoopLandingVideo();

const populateWixData = async () => {
  const wix = new WixData();
  await wix.fetchDataItems();
  wix.updateCollections();
}

populateWixData();