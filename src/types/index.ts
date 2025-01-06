export interface ScraperOptions {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string;
}

export interface ScrapedData {
    title: string;
    content: string;
    date?: Date;
    [key: string]: any; // Permite propiedades adicionales
}