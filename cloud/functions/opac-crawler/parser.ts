import * as cheerio from 'cheerio';
import type { Category } from './categories';

export interface Book {
  recCtrlId: string;
  categoryCode: string;
  categoryName: string;
  topCategoryCode: string;
  topCategoryName: string;
  title: string;
  authors: string;
  isbnIssn: string;
  publisher: string;
  publishDate: string;
  classnoAbs: string;
  searchNo: string;
  subjectTerms: string;
  libraryName: string;
  holdingsCount: number;
  availableCount: number;
  rating: number;
  commentCount: number;
  materialType: string;
  detailUrl: string;
  rawJson?: Record<string, unknown>;
}

export interface Holding {
  recCtrlId: string;
  categoryCode: string;
  topCategoryCode: string;
  department: string;
  barcode: string;
  searchNo: string;
  registerNo: string;
  circulationStatus: string;
  shelfStatus: string;
  locationUrl: string;
  rawText: string;
}

const LABELS: Record<string, string> = {
  'ISBN/ISSN': 'isbnIssn',
  '价格': 'price',
  '出版': 'publication',
  '载体形态': 'physicalDescription',
  '丛编': 'series',
  '其他题名': 'otherTitle',
  '中图分类号': 'classnoAbs',
  '责任者': 'responsibility',
  '评分': 'ratingText'
};

function cleanText(value: string | undefined): string {
  return ((value || '').replace(/\xa0/g, ' ').split(/\s+/).join(' ')).trim();
}

function materialTypeFor(recCtrlId: string | undefined): string {
  if (recCtrlId && recCtrlId.startsWith('1')) {
    return '期刊';
  }
  return '图书';
}

export function normalizeBook(
  item: Record<string, unknown>,
  category: Category,
  topCategoryName: string,
  baseUrl: string
): Book {
  const recCtrlId = String(item.recCtrlId || '');
  const terms = item.termList as string[] || [];
  
  return {
    recCtrlId,
    categoryCode: category.code,
    categoryName: category.name,
    topCategoryCode: category.topCode,
    topCategoryName,
    title: String(item.title || ''),
    authors: String(item.authors || ''),
    isbnIssn: String(item.isn || ''),
    publisher: String(item.publisher || ''),
    publishDate: String(item.pubdateDate || ''),
    classnoAbs: String(item.classnoAbs || ''),
    searchNo: String(item.bookSearchNo || ''),
    subjectTerms: Array.isArray(terms) ? terms.join('; ') : String(item.subjectTerm || ''),
    libraryName: String(item.libraryName || ''),
    holdingsCount: Number(item.guancangCount || 0),
    availableCount: Number(item.kejieCount || 0),
    rating: Number(item.reGrade || 0),
    commentCount: Number(item.commentCount || 0),
    materialType: materialTypeFor(recCtrlId),
    detailUrl: recCtrlId ? `${baseUrl}/bookInfo_${recCtrlId}.html` : '',
    rawJson: item
  };
}

export function parseDetailFields(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  
  const text = $.text();
  const lines = text.split('\n');
  
  for (const line of lines) {
    const cleanLine = cleanText(line);
    if (!cleanLine) continue;
    
    for (const [label, key] of Object.entries(LABELS)) {
      if (cleanLine.startsWith(label + ':') || cleanLine.startsWith(label + '：')) {
        const parts = cleanLine.split(/[:：]/);
        if (parts.length > 1) {
          fields[key] = cleanText(parts.slice(1).join(':'));
        }
      }
    }
  }
  
  return fields;
}

export function parseHoldings(
  html: string,
  recCtrlId: string,
  categoryCode: string,
  topCategoryCode: string,
  baseUrl: string
): Holding[] {
  const $ = cheerio.load(html);
  const tbody = $('#guancanglist');
  
  if (!tbody.length) {
    return [];
  }
  
  const rows: Holding[] = [];
  
  tbody.find('tr').each((_, tr) => {
    const cells: string[] = [];
    $(tr).find('td').each((_, td) => {
      const text = cleanText($(td).text());
      if (text) {
        cells.push(text);
      }
    });
    
    let locationUrl = '';
    $(tr).find('a[href]').each((_, link) => {
      const href = $(link).attr('href') || '';
      const linkText = $(link).text();
      if (href.includes('position') || linkText.includes('架位')) {
        locationUrl = href.startsWith('http') ? href : `${baseUrl}/${href.replace(/^\//, '')}`;
      }
    });
    
    let barcode = '';
    for (const cell of cells) {
      if (/^\d{6,}$/.test(cell)) {
        barcode = cell;
        break;
      }
    }
    
    if (!barcode) {
      $(tr).find('a').each((_, link) => {
        const onClick = $(link).attr('onclick') || '';
        const href = $(link).attr('href') || '';
        const match = onClick.match(/yujieTip\('([^']+)'\)/) || href.match(/yujieTip\('([^']+)'\)/);
        if (match) {
          barcode = match[1];
        }
      });
    }
    
    const row: Holding = {
      recCtrlId,
      categoryCode,
      topCategoryCode,
      department: cells[0] || '',
      barcode,
      searchNo: cells.length > 2 ? cells[2] : '',
      registerNo: cells.length > 3 ? cells[3] : '',
      circulationStatus: cells.length > 5 ? cells[cells.length - 2] : '',
      shelfStatus: cells.length > 5 ? cells[cells.length - 1] : '',
      locationUrl,
      rawText: cells.join(' | ')
    };
    
    if (Object.values(row).some(v => v)) {
      rows.push(row);
    }
  });
  
  return rows;
}
