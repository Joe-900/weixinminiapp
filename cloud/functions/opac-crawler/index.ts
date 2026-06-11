import cloud from '@cloudbase/node-sdk';
import { OpacClient } from './opacClient';
import { extractCategories, selectCategories, getTopCategories, topCodeFor, type Category } from './categories';
import { normalizeBook, parseDetailFields, parseHoldings, type Book, type Holding } from './parser';
import { successResponse, errorResponse } from '../common/response';

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
const db = app.database();

interface CrawlState {
  categoryCode: string;
  lastPage: number;
  totalPage: number;
  totalRecords: number;
  done: boolean;
  updatedAt: number;
}

interface CrawlResult {
  totalBooks: number;
  totalHoldings: number;
  categoriesCrawled: number;
  startTime: number;
  endTime: number;
}

export async function main(event: { action: string; [key: string]: any }) {
  const { action } = event;

  try {
    switch (action) {
      case 'crawl':
        return await crawl(event);
      case 'getCategories':
        return await getCategories(event);
      case 'getBooks':
        return await getBooks(event);
      case 'getBookDetail':
        return await getBookDetail(event);
      case 'getHoldings':
        return await getHoldings(event);
      case 'getCrawlStatus':
        return await getCrawlStatus(event);
      case 'clearCrawlData':
        return await clearCrawlData(event);
      case 'syncBooksToReservation':
        return await syncBooksToReservation(event);
      default:
        return errorResponse(400, '无效的操作');
    }
  } catch (error) {
    console.error('OPAC Crawler error:', error);
    return errorResponse(500, `系统错误: ${(error as Error).message}`);
  }
}

async function crawl(event: { 
  codes?: string[]; 
  maxPages?: number; 
  full?: boolean; 
  resume?: boolean;
  delay?: number;
  pageSize?: number;
  maxBooks?: number;
}): Promise<ReturnType<typeof successResponse>> {
  const codes = event.codes || [];
  const maxPages = event.maxPages || 1;
  const isFull = event.full || false;
  const resume = event.resume || false;
  const delay = event.delay || 1.2;
  const pageSize = event.pageSize || 20;
  const maxBooks = event.maxBooks || 0;

  const client = new OpacClient(delay);
  const startTime = Date.now();
  let totalBooks = 0;
  let totalHoldings = 0;
  let categoriesCrawled = 0;

  try {
    const classifyHtml = await client.getText('search-classify.html', `${client.getBaseUrl()}/index.html`);
    const categories = extractCategories(classifyHtml);
    
    await saveCategories(categories);

    const selected = selectCategories(categories, codes, !event.includeParentCategories);
    
    if (selected.length === 0) {
      return errorResponse(400, '没有选择任何分类，请检查 --codes 参数或 OPAC 分类页面');
    }

    for (const category of selected) {
      const state = resume ? await getCrawlState(category.code) : null;
      if (state && state.done) {
        continue;
      }

      const startPage = state ? state.lastPage + 1 : 1;
      const topName = await getTopCategoryName(category.topCode);
      let pageNo = startPage;
      let totalPage: number | null = null;
      categoriesCrawled++;

      while (true) {
        try {
          const payload = {
            classnoAbs: category.code,
            pageNo,
            pageSize,
            order: '1'
          };

          const data = await client.postJson('search-classify.json', payload, client.getRefererClassify());
          
          if ((data.result as Record<string, unknown>)?.code !== 0) {
            console.warn(`OPAC returned error for ${category.code} page ${pageNo}:`, data);
            break;
          }

          totalPage = Number(data.totalPage) || 0;
          const totalRecords = Number(data.total) || 0;
          const records = (data.data as Record<string, unknown>[]) || [];

          if (totalRecords === 0 || (totalPage === 0 && records.length === 0)) {
            console.info(`Category ${category.code} has no records; marking as done.`);
            await updateCrawlState(category.code, pageNo, totalPage, totalRecords, true);
            break;
          }

          for (const item of records) {
            const recCtrlId = String(item.recCtrlId || '');
            if (!recCtrlId) continue;

            let book = normalizeBook(item, category, topName, client.getBaseUrl());

            try {
              const info = await client.postJson('search_info.json', { sid: recCtrlId }, client.getRefererClassify());
              if ((info.result as Record<string, unknown>)?.code === 0 && typeof info.data === 'object') {
                const updatedBook = normalizeBook(info.data as Record<string, unknown>, category, topName, client.getBaseUrl());
                book = { ...book, ...updatedBook };
              }
            } catch (exc) {
              console.warn(`Failed to fetch search_info for ${recCtrlId}:`, exc);
            }

            let detailHtml = '';
            try {
              detailHtml = await client.getText(`bookInfo_${recCtrlId}.html`, client.getRefererClassify());
              const detailFields = parseDetailFields(detailHtml);
              if (detailFields.classnoAbs) {
                book.classnoAbs = detailFields.classnoAbs;
              }
            } catch (exc) {
              console.warn(`Failed to fetch detail page for ${recCtrlId}:`, exc);
            }

            const holdings = detailHtml ? parseHoldings(detailHtml, recCtrlId, category.code, category.topCode, client.getBaseUrl()) : [];
            
            await saveBook(book);
            if (holdings.length > 0) {
              await saveHoldings(holdings);
              totalHoldings += holdings.length;
            }

            totalBooks++;

            if (maxBooks > 0 && totalBooks >= maxBooks) {
              await updateCrawlState(category.code, pageNo, totalPage, totalRecords, false);
              const endTime = Date.now();
              return successResponse({
                totalBooks,
                totalHoldings,
                categoriesCrawled,
                startTime,
                endTime,
                message: '已达到最大图书数量限制，停止爬取',
                completed: false
              } as CrawlResult);
            }
          }

          const done = totalPage !== null && pageNo >= totalPage;
          await updateCrawlState(category.code, pageNo, totalPage, totalRecords, done);

          if (done) break;
          if (!isFull && pageNo >= maxPages) break;
          pageNo++;

        } catch (exc) {
          console.error(`Error crawling ${category.code} page ${pageNo}:`, exc);
          break;
        }
      }
    }

    const endTime = Date.now();
    return successResponse({
      totalBooks,
      totalHoldings,
      categoriesCrawled,
      startTime,
      endTime,
      message: '爬取完成',
      completed: true
    } as CrawlResult);

  } catch (error) {
    const endTime = Date.now();
    console.error('Crawl failed:', error);
    return errorResponse(500, `爬取失败: ${(error as Error).message}`);
  }
}

async function saveCategories(categories: Category[]): Promise<void> {
  const collection = db.collection('opac_categories');
  
  for (const cat of categories) {
    await collection.where({ code: cat.code }).get().then(async (res) => {
      if (res.data.length === 0) {
        await collection.add({
          ...cat,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else {
        await collection.where({ code: cat.code }).update({
          ...cat,
          updatedAt: Date.now()
        });
      }
    });
  }
}

async function saveBook(book: Book): Promise<void> {
  const collection = db.collection('opac_books');
  
  await collection.where({ recCtrlId: book.recCtrlId }).get().then(async (res) => {
    if (res.data.length === 0) {
      await collection.add({
        ...book,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    } else {
      await collection.where({ recCtrlId: book.recCtrlId }).update({
        ...book,
        updatedAt: Date.now()
      });
    }
  });
}

async function saveHoldings(holdings: Holding[]): Promise<void> {
  const collection = db.collection('opac_holdings');
  
  for (const holding of holdings) {
    await collection.where({ barcode: holding.barcode }).get().then(async (res) => {
      if (res.data.length === 0) {
        await collection.add({
          ...holding,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else {
        await collection.where({ barcode: holding.barcode }).update({
          ...holding,
          updatedAt: Date.now()
        });
      }
    });
  }
}

async function getCrawlState(categoryCode: string): Promise<CrawlState | null> {
  const collection = db.collection('opac_crawl_state');
  const res = await collection.where({ categoryCode }).get();
  return res.data.length > 0 ? (res.data[0] as CrawlState) : null;
}

async function updateCrawlState(
  categoryCode: string,
  lastPage: number,
  totalPage: number,
  totalRecords: number,
  done: boolean
): Promise<void> {
  const collection = db.collection('opac_crawl_state');
  
  await collection.where({ categoryCode }).get().then(async (res) => {
    if (res.data.length === 0) {
      await collection.add({
        categoryCode,
        lastPage,
        totalPage,
        totalRecords,
        done,
        updatedAt: Date.now()
      });
    } else {
      await collection.where({ categoryCode }).update({
        lastPage,
        totalPage,
        totalRecords,
        done,
        updatedAt: Date.now()
      });
    }
  });
}

async function getTopCategoryName(topCode: string): Promise<string> {
  const collection = db.collection('opac_categories');
  const res = await collection.where({ code: topCode }).get();
  return res.data.length > 0 ? String((res.data[0] as Category).name) : topCode;
}

async function getCategories(event: {}): Promise<ReturnType<typeof successResponse>> {
  const collection = db.collection('opac_categories');
  const res = await collection.get();
  return successResponse({
    list: res.data,
    total: res.data.length
  });
}

async function getBooks(event: { 
  keyword?: string; 
  categoryCode?: string;
  page?: number; 
  pageSize?: number 
}): Promise<ReturnType<typeof successResponse>> {
  const collection = db.collection('opac_books');
  let query = collection;

  if (event.keyword) {
    const kw = event.keyword.toLowerCase();
    query = query.or([
      { title: db.RegExp({ regexp: kw, options: 'i' }) },
      { authors: db.RegExp({ regexp: kw, options: 'i' }) },
      { isbnIssn: db.RegExp({ regexp: kw, options: 'i' }) }
    ]);
  }

  if (event.categoryCode) {
    query = query.where({ categoryCode: event.categoryCode });
  }

  const page = event.page || 1;
  const pageSize = event.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const totalRes = await query.count();
  const listRes = await query.skip(offset).limit(pageSize).get();

  return successResponse({
    list: listRes.data,
    total: totalRes.total,
    page,
    pageSize
  });
}

async function getBookDetail(event: { recCtrlId: string }): Promise<ReturnType<typeof successResponse>> {
  if (!event.recCtrlId) {
    return errorResponse(400, 'recCtrlId is required');
  }

  const bookCollection = db.collection('opac_books');
  const bookRes = await bookCollection.where({ recCtrlId: event.recCtrlId }).get();

  if (bookRes.data.length === 0) {
    return errorResponse(404, '图书不存在');
  }

  const holdingCollection = db.collection('opac_holdings');
  const holdingRes = await holdingCollection.where({ recCtrlId: event.recCtrlId }).get();

  return successResponse({
    book: bookRes.data[0],
    holdings: holdingRes.data
  });
}

async function getHoldings(event: { recCtrlId?: string; barcode?: string }): Promise<ReturnType<typeof successResponse>> {
  const collection = db.collection('opac_holdings');
  let query = collection;

  if (event.recCtrlId) {
    query = query.where({ recCtrlId: event.recCtrlId });
  } else if (event.barcode) {
    query = query.where({ barcode: event.barcode });
  }

  const res = await query.get();
  return successResponse({
    list: res.data,
    total: res.data.length
  });
}

async function getCrawlStatus(event: {}): Promise<ReturnType<typeof successResponse>> {
  const stateCollection = db.collection('opac_crawl_state');
  const bookCollection = db.collection('opac_books');
  const holdingCollection = db.collection('opac_holdings');
  const categoryCollection = db.collection('opac_categories');

  const [stateRes, bookRes, holdingRes, categoryRes] = await Promise.all([
    stateCollection.get(),
    bookCollection.count(),
    holdingCollection.count(),
    categoryCollection.count()
  ]);

  const completed = (stateRes.data as CrawlState[]).filter(s => s.done).length;
  const total = stateRes.data.length;

  return successResponse({
    totalBooks: bookRes.total,
    totalHoldings: holdingRes.total,
    totalCategories: categoryRes.total,
    crawledCategories: total,
    completedCategories: completed,
    states: stateRes.data
  });
}

async function clearCrawlData(event: {}): Promise<ReturnType<typeof successResponse>> {
  await db.collection('opac_books').remove();
  await db.collection('opac_holdings').remove();
  await db.collection('opac_crawl_state').remove();
  
  return successResponse('数据已清空');
}

async function syncBooksToReservation(event: {}): Promise<ReturnType<typeof successResponse>> {
  const bookCollection = db.collection('opac_books');
  const reservationBookCollection = db.collection('books');
  
  const res = await bookCollection.get();
  const opacBooks = res.data as Book[];
  
  let syncedCount = 0;
  let skippedCount = 0;

  for (const book of opacBooks) {
    const existing = await reservationBookCollection.where({ isbn: book.isbnIssn }).get();
    
    if (existing.data.length === 0) {
      await reservationBookCollection.add({
        bookId: `book_${book.recCtrlId}`,
        title: book.title,
        author: book.authors,
        isbn: book.isbnIssn,
        cover: '',
        summary: book.subjectTerms || '暂无简介',
        status: book.availableCount > 0 ? 'online' : 'offline',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        holdingsCount: book.holdingsCount,
        availableCount: book.availableCount,
        publisher: book.publisher,
        publishDate: book.publishDate,
        categoryCode: book.categoryCode,
        categoryName: book.categoryName,
        recCtrlId: book.recCtrlId
      });
      syncedCount++;
    } else {
      skippedCount++;
    }
  }

  return successResponse({
    syncedCount,
    skippedCount,
    totalOpacBooks: opacBooks.length
  });
}
