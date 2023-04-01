import axios from 'axios';
import { log, time, sleep } from '../utilities';
import { addOrUpdateItem } from '../databases';

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

  while (true && repeatedErrors < 10) {
    try {
      const response = await axios.get(
        'https://steamcommunity.com/market/search/render',
        {
          params: parameters,
        }
      );

      if (response.status !== 200) {
        throw new Error(`Invalid response status code ${response.status}`);
      }

      if (!response.data || !response.data.results) {
        throw new Error('Invalid response data');
      }

      if (response.data.results.length === 0) {
        break;
      }

      const itemsToAdd: any[] = response.data.results.map((item: any) => {
        const name: string = item.name;
        const price: number = parseFloat(
          item.sell_price_text.replace(/,|[$]/g, '')
        );
        const listings: number = item.sell_listings;
        const image: string =
          steamItemImageUrl + item.asset_description.icon_url;
        const classID: number = parseInt(item.asset_description.classid);

        return {
          name: name,
          data: {
            Details: {
              Image: image,
              Listings: { [currentTime]: listings },
              Price: { [currentTime]: price },
              ItemID: classID,
            },
          },
        };
      });

      for (let i = 0; i < itemsToAdd.length; i += 100) {
        const batchToAdd = itemsToAdd.slice(i, i + 100);
        await Promise.all(
          batchToAdd.map(async (item) => {
            try {
              await addOrUpdateItem(item.name, item.data);
            } catch (error: any) {
              log.error(`Error adding/updating item ${item.name}: ${error}`);
            }
          })
        );
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
};
