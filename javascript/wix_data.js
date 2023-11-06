import { createClient, OAuthStrategy } from '@wix/api-client';
import { items } from '@wix/data';
import { files } from '@wix/media';

export default class WixData {
  constructor() {
    this.dataItems = {};
    this.collectionElements = document.querySelectorAll('[data-collection-id]');

    this.setClient();
  }

  setClient() {
    this.wixClient = createClient({
      modules: { items, files },
      auth: OAuthStrategy({
        clientId: '566eb5fc-8c52-4533-b553-1b0f2ce1cf02',
        tokens: null,
      })
    });
  }

  async fetchDataItems() {
    for (const el of this.collectionElements) {
      const id = el.dataset.collectionId;
      const response = await this.wixClient.items.queryDataItems({ dataCollectionId: id }).ascending('orderId').find();
      // todo: response error handling
      this.dataItems[id] = response.items[0].data;
    }
  }

  updateCollections() {
    for (const el of this.collectionElements) {
      this.updateItems(el)    
    }
  }


  updateItems(el) {
    const collectionData = this.dataItems[el.dataset.collectionId];

    for (const [key, value] of Object.entries(collectionData)) {
      if(key === "_id" && value !== "SINGLE_ITEM_ID") {
        console.log("SINGLE_ITEM_ID is not set correctly in the data collection", key, value);
      }

      if (key.startsWith("_")) continue;

      const itemEl = el.querySelector(`[data-item="${key}"]`);

      if (!itemEl) continue;

      if (itemEl.href) itemEl.href = value;

      itemEl.innerHTML = value;
    }
  }
}