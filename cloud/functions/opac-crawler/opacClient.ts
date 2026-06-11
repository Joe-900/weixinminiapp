import axios, { AxiosInstance, AxiosResponse } from 'axios';

const BASE_URL = 'http://opac.bupt.edu.cn:8080';
const REFERER_CLASSIFY = `${BASE_URL}/search-classify.html`;

export class OpacClient {
  private axiosInstance: AxiosInstance;
  private delay: number;
  private retries: number;
  private timeout: number;

  constructor(delay: number = 1.2, retries: number = 3, timeout: number = 30000) {
    this.delay = delay;
    this.retries = retries;
    this.timeout = timeout;
    
    this.axiosInstance = axios.create({
      baseURL: BASE_URL,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; bupt-library-crawler/0.1; educational research)',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': `${BASE_URL}/index.html`
      }
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async jitterDelay(): Promise<void> {
    const jitter = this.delay > 0 ? Math.random() * this.delay * 250 : 0;
    await this.sleep(this.delay * 1000 + jitter);
  }

  async getText(path: string, referer?: string): Promise<string> {
    const response = await this.request('GET', path, undefined, referer);
    return response.data;
  }

  async postJson(path: string, data: Record<string, unknown>, referer: string): Promise<Record<string, unknown>> {
    const response = await this.request('POST', path, data, referer);
    return response.data as Record<string, unknown>;
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, unknown>,
    referer?: string
  ): Promise<AxiosResponse> {
    const url = path.startsWith('http') ? path : `${BASE_URL}/${path.replace(/^\//, '')}`;
    const headers: Record<string, string> = {};
    
    if (referer) {
      headers['Referer'] = referer;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      await this.jitterDelay();
      
      try {
        const response = await this.axiosInstance.request({
          method,
          url,
          data,
          headers,
          timeout: this.timeout
        });

        if (response.data && typeof response.data === 'string' && response.data.includes('Error Referer')) {
          throw new Error('OPAC rejected the request because Referer is missing or invalid.');
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        const wait = Math.min(30000, this.delay * 1000 * Math.pow(2, attempt));
        console.warn(`Request failed (${method} ${url}), attempt ${attempt}/${this.retries}: ${lastError.message}`);
        await this.sleep(wait);
      }
    }

    throw new Error(`Request failed after ${this.retries} attempts: ${url}`);
  }

  getBaseUrl(): string {
    return BASE_URL;
  }

  getRefererClassify(): string {
    return REFERER_CLASSIFY;
  }
}
