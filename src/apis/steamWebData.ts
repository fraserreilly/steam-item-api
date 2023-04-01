import * as dotenv from 'dotenv';
import axios from 'axios';
import { log, time, sleep } from '../utilities';
import { addOrUpdateItem } from '../databases';

dotenv.config();

export const getItemWebData = async (
  appID: number,
  itemID: number,
  language: string
): Promise<void> => {
  let repeatedErrors = 0;
  let parameters = {
    key: process.env.STEAMAPIKey,
    appid: appID,
    classid0: itemID,
    language: language,
  };

  while (true && repeatedErrors < 10) {
    try {
      const response = await axios.get(
        'https://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v1/',
        {
          params: parameters,
        }
      );

      if (response.status !== 200) {
        throw new Error(`Invalid response status code ${response.status}`);
      }

      if (!response.data || !response.data.result) {
        throw new Error('Invalid response data');
      }

      if (response.data.result.length === 0) {
        break;
      }

      const marketName = response.data.result[itemID].market_name;
      const description = {
        collection: response.data.result[itemID].tags.find(
          (tag: any) => tag.category_name === 'Collection'
        ).name,
        rarity: response.data.result[itemID].tags.find(
          (tag: any) => tag.category_name === 'Quality'
        ).name,
        wear: response.data.result[itemID].tags.find(
          (tag: any) => tag.category_name === 'Exterior'
        ).name,
      };

      addOrUpdateItem(marketName, description);
      repeatedErrors = 0;
      sleep(time(5, 'seconds'));
    } catch (error: any) {
      if (
        error.response &&
        (error.response.status === 429 || error.response.status === 503)
      ) {
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
