import axios from 'axios';
import { log, time, sleep } from '../utilities';
import { getItemWebData } from './steamWebData';
import { getAllItems } from '../databases';

type SteamRequestParameters = {
  appid: number;
  count: number;
  search_descriptions: 0;
  sort_column: 'default' | 'quantity' | 'price';
  sort_dir: 'desc' | 'asc';
  norender: 1;
  start: number;
};

export const getItemMarketData = async (
  appID: SteamRequestParameters['appid'],
  sortDirection: SteamRequestParameters['sort_dir'],
  sortColumn: SteamRequestParameters['sort_column']
): Promise<void> => {
  const currentTime = Math.floor(new Date().getTime() / 1000 / 86400) * 86400;
  let repeatedErrors = 0;
  const steamItemImageUrl =
    'https://steamcommunity-a.akamaihd.net/economy/image/';
  let parameters: SteamRequestParameters = {
    search_descriptions: 0,
    sort_dir: sortDirection,
    sort_column: sortColumn,
    appid: appID,
    norender: 1,
    count: 100,
    start: 0,
  };

  log.debug(`Requesting cached data from appID: ${appID}...`);

  const cache: any = await getAllItems(appID);

  while (repeatedErrors < 10) {
    try {
      const response = await axios.get(
        'https://steamcommunity.com/market/search/render',
        {
          params: parameters,
        }
      );

      log.debug(
        `Requesting market data range: ${parameters.start} to ${
          parameters.start + 100
        } for appID: ${appID}...`
      );

      await sleep(time(5, 'seconds'));

      if (response.status !== 200) {
        throw new Error(`Invalid response status code ${response.status}`);
      }

      if (!response.data || !response.data.results) {
        throw new Error('Invalid response data');
      }

      if (response.data.results.length === 0) {
        break;
      }

      const itemsToAdd: Record<any, any> = {};
      response.data.results.forEach((item: any) => {
        const name: string = item.name;
        const price: number = parseFloat(
          item.sell_price_text.replace(/,|[$]/g, '')
        );
        const listings: number = item.sell_listings;
        const image: string =
          steamItemImageUrl + item.asset_description.icon_url;
        const itemID: number = parseInt(item.asset_description.classid);

        itemsToAdd[Buffer.from(name).toString('base64')] = {
          Image: image,
          Listings: { [currentTime]: listings },
          Price: { [currentTime]: price },
          ItemID: itemID,
        };
      });

      for (let [itemName, itemData] of Object.entries(itemsToAdd)) {
        const cachedItem = cache[itemName];

        try {
          let additionalData: {
            Collection: string | null;
            Rarity: string | null;
            Wear: string | null;
          } = {
            Collection: cachedItem ? cachedItem.Collection : null,
            Rarity: cachedItem ? cachedItem.Rarity : null,
            Wear: cachedItem ? cachedItem.Wear : null,
          };
          if (
            cachedItem &&
            cachedItem.Collection &&
            cachedItem.Rarity &&
            cachedItem.Wear
          ) {
            log.debug(`Skipping additional data fetch for ${itemName}`);
          } else {
            additionalData = await getItemWebData(appID, itemData.ItemID, 'en');
            log.debug(
              `Adding/updating item: ${Buffer.from(
                itemName,
                'base64'
              ).toString()} with additional data: ${JSON.stringify(
                additionalData
              )}...`
            );
          }

          itemData = {
            ...itemData, // keep existing details
            ...additionalData, // add additional data to details
          };

          // Update item in cache
          if (cachedItem) {
            const currentListings = cachedItem.Listings;
            const currentPrice = cachedItem.Price;

            // Add new data to existing data
            itemData.Listings = {
              ...currentListings,
              [currentTime]: itemData.Listings[currentTime],
            };
            itemData.Price = {
              ...currentPrice,
              [currentTime]: itemData.Price[currentTime],
            };

            // Merge with existing data
            cache[itemName] = {
              ...cachedItem,
              ...itemData,
            };
          } else {
            // Add new item to cache
            cache[itemName] = itemData;
          }
        } catch (error: any) {
          log.error(
            `Error adding/updating item ${Buffer.from(
              itemName,
              'base64'
            ).toString()}: ${error}`
          );
        }
      }

      parameters.start += 100;
      repeatedErrors = 0;
    } catch (error: any) {
      if (
        error.response &&
        (error.response.status === 429 || error.response.status === 503)
      ) {
        repeatedErrors++;
        log.warn(
          'Rate limit exceeded or server error, sleeping for 5 minutes.'
        );
        await sleep(time(5, 'minutes'));
      } else {
        log.error(error);
        break;
      }
    }
  }
  return cache;
};
