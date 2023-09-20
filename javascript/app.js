import './dialog.js';
import WixData from './wix_data.js';

const populateWixData = async() => {
  const wix = new WixData();
  await wix.fetchDataItems();
  wix.updateCollections();
}

populateWixData();
