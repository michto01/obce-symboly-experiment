import * as readline from 'readline';
import * as util from 'util';

import axios from 'axios';
import { load } from 'cheerio';

const CUZK_URL = 'https://vdp.cuzk.cz/vdp/ruian/obce/';
const REKOS_URL = 'https://rekos.psp.cz/vyhledani-symbolu?';

function inspectCZUK(data : any) {
  const $ = load(data)
  var result : any = {};

  //result['kod'] = $('.pageStartRight').text().split(' ')[1];

  // Symbol and flag
  const table     = $('.detailVlajkaZnak tr:nth-child(2) > td');
  const hasFlag   = table.find(':nth-child(1) textarea').text().length;
  const flag      = table.find(':nth-child(2) img').attr('src');
  const hasSymbol = table.find(':nth-child(3) textarea').text().length;
  const symbol    = table.find(':nth-child(4) img').attr('src');

  // If textarea is empty assume that the image is missing
  if (hasFlag)   result['vlajka'] = `https://vdp.cuzk.cz${flag}`;
  if (hasSymbol) result['symbol'] = `https://vdp.cuzk.cz${symbol}`;
  
  const generic = $('div > table.detail tr');
  result['pou'] = generic.find(':nth-child(4) > td:nth-child(2)').text();
  result['kraj'] = generic.find(':nth-child(2) > td:nth-child(2)').text();
  result['okres'] = generic.find(':nth-child(2) > td:nth-child(4)').text();
  
  const more = $('.top.detailSplitTable:nth-child(1) .detail.detail2columns tr');
  result['name'] = more.find(':nth-child(1) > td:nth-child(2)').text();
  result['LUA2'] = more.find(':nth-child(5) > td:nth-child(2)').text();

  return result;
}

function helper_rekos_not_found(str : string) {
  return str == "Nebyl nalezen žádný záznam, zadejte, nebo změňte výběrové podmínky.";
}

async function searchREKOS(
  name : string, 
  pou: string
): Promise<any | null> {
    const res = await axios.get(`${REKOS_URL}obec=${encodeURIComponent(name)}&poverena_obec=${encodeURIComponent(pou)}`);
    const $ = load(res.data);

    if (helper_rekos_not_found($('#main-content div p').text())) {
      //console.warn("REKOS data not found!");
      return null;
    }

    const zebra = $('.zebra tr td:nth-child(1) a').attr('href');
    const zebra_url = `https://rekos.psp.cz${zebra}`;
    const content = await inspectREKOS(zebra_url);
    return {
      url: zebra_url,
      content: content
    };
}

async function inspectREKOS(
  url : string | null
): Promise<any | null> {
  if (url == null) return null;

  const res = await axios.get(`${url}`);
  const $ = load(res.data);

  const rdata = $('div#main-content > div.column');
  var result : any = {};

  result['znak'] = {
    popis: $(rdata.find('.first p')[0]).text(),
    url: `https://rekos.psp.cz${rdata.find('.first p a').attr('href')}`
  }

  result['vlajka'] = {
    popis: $(rdata.find('.second p')[0]).text(),
    url: `https://rekos.psp.cz${rdata.find('.second p a').attr('href')}`
  }
  
  return result;
}


async function getSymbolMetadata(
  code : number
): Promise<Object | null> {
  if (isNaN(code)) return null;

  await axios.get(`${CUZK_URL}${code}`).then(async (res) => {
    var scraps = inspectCZUK(res.data);
    scraps['REKOS'] = await searchREKOS(scraps.name, scraps.pou);
    console.log(util.inspect(scraps, false, Infinity, true));

    return scraps;
  }).catch((reason) => {
    console.error(reason);
  });

  return null;
}



/*
console.log('This is an experimental symbol scrapper.');
let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Get data for municipality [code]: ", (code) => {
  console.log(`Put in code: ${code}`);
  getSymbolMetadata(Number(code));
  rl.close();
});

rl.close();
*/

getSymbolMetadata(535826);
getSymbolMetadata(599140);

