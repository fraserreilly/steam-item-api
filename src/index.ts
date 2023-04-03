import { getItemMarketData } from './apis';
import { addOrUpdateItem } from './databases';
import { sleep, time, log } from './utilities';

const updateItems = async (appID: number) => {
  log.info(`updating firebase appID: ${appID}...`);
  const items: any = await getItemMarketData(appID, 'desc', 'default');
  log.info(
    `updating firebase appID: ${appID} with ${
      Object.keys(items).length
    } items...`
  );

  for (let [itemName, itemData] of Object.entries(items)) {
    log.debug(
      `pushing item: ${Buffer.from(
        itemName,
        'base64'
      ).toString()}: ${JSON.stringify(itemData)} to firebase...`
    );
    await addOrUpdateItem(appID, itemName, itemData);
  }
};

async function run() {
  await updateItems(730);
}

run();
