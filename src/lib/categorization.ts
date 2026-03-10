// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'this', 'that',
  'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
  'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'about', 'up', 'also', 'well',
  // Chinese stop words
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
  '什么', '怎么', '如何', '为什么', '可以', '能', '把', '被', '让',
]);

/**
 * Extract keywords from text (supports Chinese + English)
 */
export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  
  // Split by non-word characters, keeping Chinese characters as individual tokens
  const tokens: string[] = [];
  
  // Extract English words
  const englishWords = normalized.match(/[a-z]{2,}/g) || [];
  tokens.push(...englishWords);
  
  // Extract Chinese character sequences (2-5 chars for keyword quality)
  const chineseSeqs = normalized.match(/[\u4e00-\u9fff]{2,}/g) || [];
  // Trim long sequences to max 5 chars, also add 2-char sub-segments for better matching
  for (const seq of chineseSeqs) {
    if (seq.length <= 5) {
      tokens.push(seq);
    } else {
      // Extract 2-4 char sub-segments from long sequences
      for (let i = 0; i < seq.length - 1 && tokens.length < 20; i++) {
        const sub2 = seq.slice(i, i + 2);
        const sub3 = seq.slice(i, Math.min(i + 3, seq.length));
        const sub4 = seq.slice(i, Math.min(i + 4, seq.length));
        if (sub2.length >= 2 && !STOP_WORDS.has(sub2)) tokens.push(sub2);
        if (sub3.length >= 3 && !STOP_WORDS.has(sub3)) tokens.push(sub3);
        if (sub4.length >= 4 && sub4.length <= 5 && !STOP_WORDS.has(sub4)) tokens.push(sub4);
      }
    }
  }
  
  // Also extract individual Chinese chars for short titles
  const chineseChars = normalized.match(/[\u4e00-\u9fff]/g) || [];
  if (chineseSeqs.length === 0 && chineseChars.length > 0) {
    tokens.push(...chineseChars);
  }
  
  // Filter stop words and deduplicate
  const filtered = tokens.filter(w => !STOP_WORDS.has(w) && w.length >= 2);
  return [...new Set(filtered)];
}

/**
 * Calculate similarity between two sets of keywords (Jaccard similarity)
 */
export function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 && keywords2.length === 0) return 1;
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  
  let intersection = 0;
  for (const word of set1) {
    if (set2.has(word)) intersection++;
  }
  
  const union = new Set([...set1, ...set2]).size;
  return intersection / union;
}

/**
 * Find the best matching category from existing categories
 */
export function findBestCategory(
  keywords: string[],
  categories: { id: string; name: string; keywords: string[] }[]
): { categoryId: string; similarity: number } | null {
  let bestMatch: { categoryId: string; similarity: number } | null = null;
  
  for (const cat of categories) {
    const sim = calculateSimilarity(keywords, cat.keywords);
    if (sim > 0.2 && (!bestMatch || sim > bestMatch.similarity)) {
      bestMatch = { categoryId: cat.id, similarity: sim };
    }
  }
  
  return bestMatch;
}

/**
 * Generate a category name from keywords
 */
export function generateCategoryName(keywords: string[]): string {
  if (keywords.length === 0) return '未分类';
  // Pick the single most representative keyword (2-5 chars)
  const best = keywords
    .filter(k => k.length >= 2 && k.length <= 5)
    .slice(0, 1);
  if (best.length === 0) return keywords[0].slice(0, 5);
  return best[0];
}

/**
 * Generate a URL-safe slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '') || 'uncategorized';
}

/**
 * Threshold for considering entries as "same knowledge point" (should merge)
 */
export const MERGE_THRESHOLD = 0.7;

/**
 * Threshold for considering entries as "same category" 
 */
export const CATEGORY_THRESHOLD = 0.2;
