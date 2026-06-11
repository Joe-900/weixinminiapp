import * as cheerio from 'cheerio';

export interface Category {
  code: string;
  name: string;
  parentCode: string;
  topCode: string;
  depth: number;
  isLeaf: boolean;
}

const TOP_CODES: Record<string, string> = {
  'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G',
  'H': 'H', 'I': 'I', 'J': 'J', 'K': 'K', 'N': 'N', 'O': 'O', 'P': 'P',
  'Q': 'Q', 'R': 'R', 'S': 'S', 'T': 'T', 'U': 'U', 'V': 'V', 'X': 'X', 'Z': 'Z'
};

export function topCodeFor(code: string): string {
  if (!code) return '';
  const firstChar = code.charAt(0).toUpperCase();
  return TOP_CODES[firstChar] || firstChar;
}

export function extractCategories(html: string): Category[] {
  const $ = cheerio.load(html);
  const categories: Category[] = [];

  $('a[href*="classnoAbs"]').each((_, element) => {
    const href = $(element).attr('href') || '';
    const match = href.match(/classnoAbs=([^&]+)/);
    
    if (match) {
      const code = decodeURIComponent(match[1]).toUpperCase();
      const name = $(element).text().trim();
      
      if (code && name) {
        const depth = code.length;
        const parentCode = depth > 1 ? code.slice(0, -1) : '';
        const topCode = topCodeFor(code);
        const isLeaf = !code.match(/^[A-Z]\d*$/);

        const exists = categories.some(c => c.code === code);
        if (!exists) {
          categories.push({
            code,
            name,
            parentCode,
            topCode,
            depth,
            isLeaf
          });
        }
      }
    }
  });

  return categories;
}

export function selectCategories(
  categories: Category[],
  codes?: string[],
  leafOnly: boolean = true
): Category[] {
  if (!codes || codes.length === 0) {
    return leafOnly ? categories.filter(c => c.isLeaf) : categories;
  }

  const selected: Category[] = [];
  const codeSet = new Set(codes.map(c => c.toUpperCase()));

  for (const code of codeSet) {
    const matched = categories.find(c => c.code === code);
    if (matched) {
      selected.push(matched);
    } else {
      selected.push({
        code: code.toUpperCase(),
        name: code.toUpperCase(),
        parentCode: code.length > 1 ? code.slice(0, -1) : '',
        topCode: topCodeFor(code),
        depth: code.length,
        isLeaf: true
      });
    }
  }

  return selected;
}

export function getTopCategories(categories: Category[]): Category[] {
  const topCodes = new Set<string>();
  const topCategories: Category[] = [];

  for (const cat of categories) {
    if (!topCodes.has(cat.topCode)) {
      topCodes.add(cat.topCode);
      topCategories.push({
        code: cat.topCode,
        name: cat.topCode,
        parentCode: '',
        topCode: cat.topCode,
        depth: 1,
        isLeaf: false
      });
    }
  }

  return topCategories;
}
