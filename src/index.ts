import { getAllItems } from './databases';
import { getItemWebData, getItemMarketData } from './apis';

const updateItems = async (language: string) => {
  const items = await getAllItems();

  for (const item of items) {
    if (!item.collection) {
      await getItemWebData(item.appID, item.itemID, language);
    }
  }
};

async function main() {
  await getItemMarketData(730, 'desc', 'default');
  await updateItems('english');
}

main();
