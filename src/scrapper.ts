import { ScrapedData, ScraperOptions } from "./types";
import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';

class Scrapper {
    constructor(private options: ScraperOptions) { }

    async saveSession(browserContext: puppeteer.BrowserContext, sessionFile: string): Promise<void> {
        const cookies = await browserContext.cookies();
        const page = await browserContext.newPage();
        const localStorageData = await page.evaluate(() => {
            let data: { [key: string]: string | null } = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key !== null) {
                    data[key] = localStorage.getItem(key);
                }
            }
            return data;
        });
        await page.close();
        fs.writeFileSync(sessionFile, JSON.stringify({ cookies, localStorageData }));
        console.log('Sesión guardada en', sessionFile);
    }

    async loadSession(browserContext: puppeteer.BrowserContext, sessionFile: string): Promise<void> {
        if (fs.existsSync(sessionFile)) {
            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            const { cookies, localStorageData } = sessionData;
            await browserContext.setCookie(...cookies.map((cookie: puppeteer.Protocol.Network.Cookie) => ({
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires,
                size: cookie.size,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
                session: cookie.session,
                sameSite: cookie.sameSite
            })));
            const page = await browserContext.newPage();
            await page.goto('about:blank');
            await page.evaluate(data => {
                for (let key in data) {
                    localStorage.setItem(key, data[key]);
                }
            }, localStorageData);
            await page.close();
            console.log('Sesión cargada desde', sessionFile);
        }
    }

    async login(page: puppeteer.Page, loginUrl: string, username: string, password: string): Promise<void> {
        await page.goto(loginUrl, { waitUntil: 'networkidle2' });

        await page.click('button.MuiButton-root');
        console.log('Hizo clic en el botón MuiButton-root');

        await page.waitForSelector('a#zocial-jala-university', { timeout: 10000 });
        console.log('Elemento a#zocial-jala-university está presente en la página');

        const elementHandle = await page.$('a#zocial-jala-university');
        if (elementHandle) {
            console.log('Elemento con id "zocial-jala-university" encontrado:', elementHandle);
            await elementHandle.click();
            console.log('Hizo clic en el elemento con id "zocial-jala-university".');
        } else {
            console.log('Elemento con id "zocial-jala-university" no encontrado.');
            return;
        }

        await page.waitForSelector('input[name="loginfmt"]', { timeout: 10000 });
        console.log('Formulario de inicio de sesión está presente en la página');

        await page.type('input[name="loginfmt"]', username);
        await page.click('input[type="submit"]');
        console.log('Ingresó el nombre de usuario y clic en el botón de submit');

        await page.waitForSelector('input[name="passwd"]', { timeout: 10000 });
        console.log('Campo de contraseña está presente en la página');

        await page.type('input[name="passwd"]', password);

        const inputContainer = await page.waitForSelector('div.ext-button-item', { timeout: 10000 });
        if (inputContainer) {
            console.log('Contenedor de entrada encontrado:', inputContainer);

            const content = await inputContainer.evaluate(el => el.innerHTML);
            console.log('Contenido del contenedor de entrada:', content);
            
            const button = await inputContainer.waitForSelector('input[type="submit"]');
            if (button) {
                console.log('Botón encontrado:', button);
                await button.click();
                console.log('Hizo clic en el botón.');
            } else {
                console.log('Botón no encontrado.');
                return;
            }
        } else {
            console.log('Contenedor de entrada no encontrado.');
            return;
        }
        console.log('Ingresó la contraseña y clic en el botón de submit');

        await new Promise(resolve => setTimeout(resolve, 20000));

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Inició sesión con las credenciales proporcionadas');

        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('Esperó 5 segundos para asegurarse de que la sesión se inicie correctamente');
    }

    async fetchData(url: string, username: string, password: string): Promise<string> {
        const browser = await puppeteer.launch({ headless: false });
        const context = await browser.createBrowserContext();
        const page = await context.newPage();

        await this.loadSession(context, 'session.json');

        const isLoggedIn = await page.evaluate(() => {
            return !!document.querySelector('a#logout');
        });

        if (!isLoggedIn) {
            await this.login(page, url, username, password);
            await this.saveSession(context, 'session.json');
        }

        await page.goto(url, { waitUntil: 'networkidle2' });
        const content = await page.content();

        await new Promise(resolve => setTimeout(resolve, 10000));

        await browser.close();
        return content;
    }

    parseData(data: string): ScrapedData {
        const $ = cheerio.load(data);
        console.log($.html());
        const infiniteScrollComponent = $('div.infinite-scroll-component');

        if (infiniteScrollComponent.length === 0) {
            throw new Error('No se encontró el elemento con la clase "infinite-scroll-component".');
        }

        console.log(infiniteScrollComponent.html());

        const parsedData: ScrapedData = {
            title: infiniteScrollComponent.find('h1').text() || "",
            content: infiniteScrollComponent.find('p').text() || "",
            date: new Date(infiniteScrollComponent.find('time').attr('datetime') || "")
        };

        console.log(parsedData);

        return parsedData;
    }

    async run(url: string, username: string, password: string): Promise<ScrapedData> {
        const data = await this.fetchData(url, username, password);
        return this.parseData(data);
    }
}

export default Scrapper;