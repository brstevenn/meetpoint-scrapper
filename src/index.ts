import Scrapper from './scrapper';
import { ScraperOptions } from './types';

const main = async () => {
    const options: ScraperOptions = {
        url: process.env.URL || 'https://meetpoint.jala.university/'
    };
    const scrapper = new Scrapper(options);
    const username = process.env.USERNAME || '';
    const password = process.env.PASSWORD || '';
    await scrapper.run(options.url, username, password);
};

main().catch(error => {
    console.error('Error ejecutando el scrapper:', error);
});