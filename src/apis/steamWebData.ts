import * as dotenv from 'dotenv';
import axios from 'axios';
import { log, time, sleep } from '../utilities';

dotenv.config();

export const getItemWebData = async (
  appID: number,
  itemID: number,
  language: string
): Promise<{
  Collection: string | null;
  Rarity: string | null;
  Wear: string | null;
}> => {
  let repeatedErrors = 0;
  let parameters = {
    key: process.env.STEAMAPIKey,
    appid: appID,
    class_count: 1,
    classid0: itemID,
    language: language,
  };

  while (repeatedErrors < 10) {
    try {
      const response = await axios.get(
        'https://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v1/',
        {
          params: parameters,
        }
      );

      await sleep(time(5, 'seconds'));

      if (response.status !== 200) {
        log.error(`Invalid response status code ${response.status}`);
      }

      if (!response.data || !response.data.result) {
        log.error('Invalid response data');
      }

      if (response.data.result.length === 0) {
        log.error('No items found');
      }
      const tags: Record<any, any> = Object.values(
        response.data.result[itemID].tags
      );
      const collection: string =
        tags.find((tag: Record<any, any>) => tag.category_name === 'Collection')
          ?.name || '';
      const rarity: string =
        tags.find((tag: Record<any, any>) => tag.category_name === 'Quality')
          ?.name || '';
      const wear: string =
        tags.find((tag: Record<any, any>) => tag.category_name === 'Exterior')
          ?.name || '';

      const description = {
        Collection: collection,
        Rarity: rarity,
        Wear: wear,
      };

      repeatedErrors = 0;
      return description;
    } catch (error: any) {
      if (
        error.response &&
        (error.response.status === 429 || error.response.status === 503)
      ) {
        log.warn(
          'Rate limit exceeded or server error, sleeping for 5 minutes.'
        );
        await sleep(time(5, 'minutes'));
        repeatedErrors++;
      } else {
        log.error(`Failed to retrieve item web data: ${error}`);
        break;
      }
    }
  }
  return { Collection: null, Rarity: null, Wear: null };
};
