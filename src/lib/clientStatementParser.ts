import { RecordType, INFLOW_CATEGORIES, OUTFLOW_CATEGORIES, RELIEF_CATEGORIES } from '@/types/onyx';

export interface ParsedTransaction {
  date: string; // ISO date string
  description: string;
  amount: number;
  type: RecordType;
  category: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  rawText: string;
  error?: string;
}

// ─── Date parsing ───────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Try every common date format used in Nigerian bank statements.
 * Returns the Date or null.
 */
function parseDate(text: string): Date | null {
  if (!text || text.length < 5) return null;
  const s = text.trim().replace(/\s+/g, ' ');

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m) return safeDate(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

  // DD/MM/YY or DD-MM-YY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (m) return safeDate(2000 + parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

  // YYYY-MM-DD or YYYY/MM/DD
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return safeDate(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));

  // DD Mon YYYY or DD-Mon-YYYY or DD Mon YY or DD-Mon-YY (e.g. 01 Jan 2025, 01-JAN-25)
  m = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-,]*(\d{2,4})$/);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
    if (month !== undefined) {
      let year = parseInt(m[3]);
      if (year < 100) year += 2000;
      return safeDate(year, month, parseInt(m[1]));
    }
  }

  // DDMon YYYY or DDMonYYYY (no separator, e.g. "01Jan 2026" or "01Jan2026")
  m = s.match(/^(\d{1,2})([A-Za-z]{3,9})[\s\-,]*(\d{2,4})$/);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
    if (month !== undefined) {
      let year = parseInt(m[3]);
      if (year < 100) year += 2000;
      return safeDate(year, month, parseInt(m[1]));
    }
  }

  // Mon DD, YYYY (e.g. Jan 01, 2025)
  m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const month = MONTH_MAP[m[1].toLowerCase().slice(0, 3)];
    if (month !== undefined) return safeDate(parseInt(m[3]), month, parseInt(m[2]));
  }

  // DDMMYYYY (8 digits, no separator)
  m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) return safeDate(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));

  return null;
}

/** Extract the first date found anywhere in a string */
function findDateInText(text: string): Date | null {
  // Try multiple regex patterns to find a date substring
  const patterns = [
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/,
    /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/,
    /\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-,]*\d{2,4}/,
    /\d{1,2}[A-Za-z]{3,9}[\s\-,]*\d{2,4}/,   // DDMonYYYY / DDMon YYYY
    /[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const d = parseDate(m[0]);
      if (d) return d;
    }
  }
  return null;
}

function safeDate(year: number, month: number, day: number): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1990 || year > 2100) return null;
  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return null;
  return d;
}

// ─── Amount parsing ─────────────────────────────────────────────────

/**
 * Locale-aware monetary amount parser.
 * Handles: 1,234.56 | 1.234,56 | 1234.56 | 1,234 | 1234 | ₦1,234.56 | (1,234.56)
 */
function parseAmount(text: string): number {
  if (!text) return 0;

  // Remove currency symbols, whitespace, and parentheses (some banks use parens for negatives)
  let str = text.replace(/[₦$#€£¥\s()]/g, '').trim();
  // Remove leading/trailing dashes that aren't part of the number
  str = str.replace(/^-+|-+$/g, '').trim();
  if (!str || !/\d/.test(str)) return 0;

  // Auto-detect locale: is comma or dot the decimal separator?
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Comma is likely the decimal separator (e.g. 1.234,56)
    str = str.replace(/\./g, '');  // Remove thousand separators (dots)
    str = str.replace(',', '.');   // Convert decimal comma to dot
  } else {
    // Dot is the decimal separator (e.g. 1,234.56) or no decimal at all (e.g. 1,234)
    str = str.replace(/,/g, '');   // Remove thousand separators (commas)
  }

  const num = parseFloat(str);
  return isNaN(num) || num <= 0 ? 0 : Math.round(num * 100) / 100;
}

/**
 * Find ALL monetary amounts in a string, returned in order.
 * Handles various formats: 1,234.56 | 1.234,56 | 1234.56 | 1234 | 12,345
 */
function findAllAmounts(text: string): number[] {
  // Match numbers with optional thousand separators and decimals
  // Patterns: 1,234,567.89 | 1.234.567,89 | 1234567.89 | 1234567 | 12,345 | 1,234
  const matches = text.match(/\d[\d.,]*\d|\d+/g) || [];
  const amounts: number[] = [];

  for (const m of matches) {
    // Skip if it looks like a date component (just 1-2 digits)
    if (m.length <= 2 && !m.includes('.') && !m.includes(',')) continue;
    // Skip pure year numbers
    const plain = m.replace(/[.,]/g, '');
    if (plain.length === 4 && parseInt(plain) >= 1990 && parseInt(plain) <= 2100) continue;

    const num = parseAmount(m);
    if (num > 0) {
      amounts.push(num);
    }
  }
  return amounts;
}

// ─── Type & Category inference ──────────────────────────────────────

const DEBIT_KEYWORDS = [
  'debit', ' dr', 'dbt', 'withdrawal', 'transfer out', 'payment',
  'purchase', 'pos ', 'atm ', 'charge', ' fee', 'outward', 'nip/',
  'web purchase', 'mbanking', 'bill payment', 'money out', 'expense',
  'spent',
];

const CREDIT_KEYWORDS = [
  'credit', ' cr', 'crt', 'deposit', 'transfer in', 'salary',
  'inward', 'refund', 'dividend', 'interest earned', 'interest credit',
  'loan disbursement', 'reversal', 'transfer from', 'received',
  'incoming', 'inflow', 'lodgement', 'cash deposit', 'alert credit',
  'money in', 'earned', 'income',
];

const RELIEF_KEYWORDS = [
  'nhf', 'pension', 'nhis', 'mortgage', 'insurance', 'annuity',
  'life insurance', 'levy', 'national housing fund',
];

function inferType(description: string, debitAmount?: number, creditAmount?: number): RecordType {
  // If we have separate debit/credit amounts, use those — this is the most reliable signal
  if (debitAmount && debitAmount > 0 && (!creditAmount || creditAmount === 0)) {
    // Check for relief keywords in outflows
    const lower = description.toLowerCase();
    if (RELIEF_KEYWORDS.some(k => lower.includes(k))) return 'relief';
    return 'outflow';
  }
  if (creditAmount && creditAmount > 0 && (!debitAmount || debitAmount === 0)) return 'inflow';

  const lower = ` ${description.toLowerCase()} `;

  // Check relief keywords first (these are always outflows/deductions)
  if (RELIEF_KEYWORDS.some(k => lower.includes(k))) return 'relief';

  // Check credits FIRST (many transactions say "transfer" which could be either)
  if (CREDIT_KEYWORDS.some(k => lower.includes(k))) return 'inflow';
  if (DEBIT_KEYWORDS.some(k => lower.includes(k))) return 'outflow';

  return 'outflow'; // Default for bank statements
}

function inferCategory(description: string, type: RecordType): string {
  const lower = description.toLowerCase();

  if (type === 'inflow') {
    if (lower.includes('salary') || lower.includes('payroll') || lower.includes('wage')) return 'Salary';
    if (lower.includes('deposit') || lower.includes('credit') || lower.includes('transfer') || lower.includes('received')) return 'Honourarium';
    if (lower.includes('gift') || lower.includes('offering') || lower.includes('donation')) return 'Voluntary Gifts';
    return 'Others';
  }

  if (type === 'relief') {
    if (lower.includes('nhf') || lower.includes('national housing fund')) return 'NHF';
    if (lower.includes('pension')) return 'Pension';
    if (lower.includes('nhis')) return 'NHIS';
    if (lower.includes('mortgage')) return 'Mortgage Interest';
    if (lower.includes('insurance') || lower.includes('annuity') || lower.includes('life insurance')) return 'Life Insurance/Annuity Premium';
    return 'NHF'; // Fallback relief category
  }

  // Outflow categories
  if (lower.includes('electric') || lower.includes('nepa') || lower.includes('phcn') || lower.includes('power') || lower.includes('disco') || lower.includes('data') || lower.includes('internet') || lower.includes('wifi') || lower.includes('airtime') || lower.includes('mtn') || lower.includes('glo') || lower.includes('airtel') || lower.includes('9mobile') || lower.includes('phone')) return 'Electricity';
  if (lower.includes('food') || lower.includes('feeding') || lower.includes('restaurant') || lower.includes('eat') || lower.includes('grocery') || lower.includes('supermarket') || lower.includes('shoprite') || lower.includes('market') || lower.includes('meal')) return 'Feeding';
  if (lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || lower.includes('gas station') || lower.includes('filling') || lower.includes('travel') || lower.includes('flight') || lower.includes('uber') || lower.includes('bolt') || lower.includes('transport') || lower.includes('taxi') || lower.includes('bus') || lower.includes('car')) return 'Travels';
  if (lower.includes('tithe') || lower.includes('offering') || lower.includes('gift') || lower.includes('giving') || lower.includes('donation')) return 'Tithe';
  if ((lower.includes('rent') && !lower.includes('repair')) || lower.includes('housing')) return 'Rent';
  if (lower.includes('school') || lower.includes('tuition') || lower.includes('fees')) return 'School Fees';
  if (lower.includes('maintenance') || lower.includes('repair')) {
    if (lower.includes('vehicle') || lower.includes('car') || lower.includes('mechanic')) return 'Repairs/Maintenance (Vehicle)';
    return 'Maintenance (Housing)';
  }
  if (lower.includes('material')) return 'Material';

  return 'Others';
}

// ─── Multi-strategy transaction extraction ──────────────────────────

/**
 * Strategy 1: Line-by-line extraction for unstructured text (e.g. from PDF).
 * Looks for lines that start with or contain a date, then extracts amounts.
 */
function extractFromUnstructuredText(
  text: string,
  targetMonth?: number,
  targetYear?: number
): ParsedTransaction[] {
  const lines = text.split('\n');
  const transactions: ParsedTransaction[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 8) continue;

    const date = findDateInText(line);
    if (!date) continue;

    // Filter by target period
    if (targetMonth !== undefined && targetYear !== undefined) {
      if (date.getMonth() !== targetMonth || date.getFullYear() !== targetYear) continue;
    }

    // Collect all text for this transaction (current line + continuation lines)
    let fullText = line;
    // Check if next lines are continuation (no date, non-empty)
    let j = i + 1;
    while (j < lines.length && j <= i + 3) {
      const nextLine = lines[j].trim();
      if (!nextLine || nextLine.length < 3) break;
      if (findDateInText(nextLine)) break; // Next transaction starts
      fullText += ' ' + nextLine;
      j++;
    }

    // Find amounts in the full text
    const amounts = findAllAmounts(fullText);
    if (amounts.length === 0) continue;

    // Remove the date portion from description
    let description = fullText;
    // Remove all date-like substrings
    description = description.replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, '');
    description = description.replace(/\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g, '');
    description = description.replace(/\d{1,2}[\s\-][A-Za-z]{3,9}[\s\-,]*\d{2,4}/g, '');
    // Remove amounts from description
    description = description.replace(/[\d,]+\.?\d*/g, '');
    // Clean up
    description = description.replace(/[|,\-:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!description || description.length < 2) description = 'Transaction';

    // Determine debit/credit
    let debitAmount = 0;
    let creditAmount = 0;
    let amount = 0;

    if (amounts.length >= 3) {
      // Likely: Debit | Credit | Balance (or Value | Date | Debit | Credit | Balance)
      // Pick the two largest non-balance amounts, or first two
      // Heuristic: last amount is usually balance
      const nonBalance = amounts.slice(0, -1);
      if (nonBalance.length >= 2) {
        // If one is 0-like (very small relative), the other is the transaction
        debitAmount = nonBalance[nonBalance.length - 2] || 0;
        creditAmount = nonBalance[nonBalance.length - 1] || 0;
        // They shouldn't both be populated for one transaction
        if (debitAmount > 0 && creditAmount > 0) {
          // Use type inference from description
          const type = inferType(description);
          if (type === 'inflow') {
            creditAmount = Math.max(debitAmount, creditAmount);
            debitAmount = 0;
          } else {
            debitAmount = Math.max(debitAmount, creditAmount);
            creditAmount = 0;
          }
        }
      } else {
        amount = nonBalance[0] || amounts[0];
      }
    } else if (amounts.length === 2) {
      // Could be Amount | Balance, or Debit | Credit
      // Use the first amount (second is likely balance)
      amount = amounts[0];
    } else {
      amount = amounts[0];
    }

    if (amount === 0) amount = debitAmount > 0 ? debitAmount : creditAmount;
    if (amount <= 0) continue;

    // Skip amounts that look like dates (4 digit year numbers)
    if (amount >= 1990 && amount <= 2100 && Number.isInteger(amount)) continue;

    const type = inferType(description, debitAmount, creditAmount);
    const category = inferCategory(description, type);
    const dateStr = date.toISOString();

    // Deduplicate
    const key = `${dateStr.split('T')[0]}|${amount.toFixed(2)}|${description.substring(0, 30).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({
      date: dateStr,
      description: description.substring(0, 200),
      amount: Math.round(amount * 100) / 100,
      type,
      category,
    });
  }

  return transactions;
}

/**
 * Strategy 2: Structured CSV/TSV parsing.
 * Detects columns from the header row and maps them.
 */
function extractFromStructuredData(
  text: string,
  targetMonth?: number,
  targetYear?: number
): ParsedTransaction[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Detect separator: tab, comma, pipe
  const firstLines = lines.slice(0, 3).join('\n');
  let separator = ',';
  if (firstLines.split('\t').length > firstLines.split(',').length) separator = '\t';
  else if (firstLines.split('|').length > firstLines.split(',').length) separator = '|';

  const splitLine = (line: string): string[] => {
    if (separator === ',') return splitCSVLine(line);
    return line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
  };

  // Try to find the header row (might not be the first line)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('date') || lower.includes('transaction') || lower.includes('narration') || lower.includes('particular')) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return []; // No header found, fall back to unstructured

  const headers = splitLine(lines[headerIdx]).map(h => h.toLowerCase().trim());

  // Map columns
  const dateIdx = headers.findIndex(h => /\bdate\b|\btransaction\b|\bvalue\b|\bposted?\b/.test(h));
  const descIdx = headers.findIndex(h =>
    /\bdescription\b|\bnarration\b|\bparticular\b|\bdetail\b|\bremark\b|\bmerchant\b|\bpayee\b|\bbeneficiary\b/.test(h)
  );
  const amountIdx = headers.findIndex(h => h === 'amount' || /\bamount\b/.test(h));
  const debitIdx = headers.findIndex(h => /\bdebit\b|\bwithdrawal\b|\bdr\b|\bmoney\s*out\b|\bexpense\b|\bout\b|\bpayment\b|\bspent\b/.test(h));
  const creditIdx = headers.findIndex(h => /\bcredit\b|\bdeposit\b|\bcr\b|\blodgement\b|\bmoney\s*in\b|\bincome\b|\bin\b|\breceived\b|\bearned\b/.test(h));
  const typeIdx = headers.findIndex(h => h === 'type' || /\btxn.?type\b|\btransaction.?type\b/.test(h));

  if (dateIdx === -1) return [];

  const transactions: ParsedTransaction[] = [];
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length <= dateIdx) continue;

    const date = parseDate(cols[dateIdx]);
    if (!date) continue;

    if (targetMonth !== undefined && targetYear !== undefined) {
      if (date.getMonth() !== targetMonth || date.getFullYear() !== targetYear) continue;
    }

    const description = (descIdx >= 0 && cols[descIdx]) ? cols[descIdx].trim() : 'Transaction';

    let debitAmount = 0;
    let creditAmount = 0;

    if (debitIdx >= 0 && creditIdx >= 0) {
      debitAmount = parseAmount(cols[debitIdx] || '');
      creditAmount = parseAmount(cols[creditIdx] || '');
    } else if (amountIdx >= 0) {
      const amt = parseAmount(cols[amountIdx] || '');
      const typeHint = typeIdx >= 0 ? (cols[typeIdx] || '').toLowerCase() : '';
      if (typeHint.includes('credit') || typeHint.includes('cr')) {
        creditAmount = amt;
      } else if (typeHint.includes('debit') || typeHint.includes('dr')) {
        debitAmount = amt;
      } else {
        const inferred = inferType(description);
        if (inferred === 'inflow') creditAmount = amt;
        else debitAmount = amt;
      }
    } else {
      // No amount column found in header, try to find amounts in remaining columns
      for (let c = 0; c < cols.length; c++) {
        if (c === dateIdx || c === descIdx || c === typeIdx) continue;
        const amt = parseAmount(cols[c]);
        if (amt > 0) {
          // First amount column found
          const inferred = inferType(description);
          if (inferred === 'inflow') creditAmount = amt;
          else debitAmount = amt;
          break;
        }
      }
    }

    const amount = debitAmount > 0 ? debitAmount : creditAmount;
    if (amount <= 0) continue;

    const type = inferType(description, debitAmount, creditAmount);
    const category = inferCategory(description, type);
    const dateStr = date.toISOString();

    const key = `${dateStr.split('T')[0]}|${amount.toFixed(2)}|${description.substring(0, 30).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({
      date: dateStr,
      description: description.substring(0, 200),
      amount: Math.round(amount * 100) / 100,
      type,
      category,
    });
  }

  return transactions;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Main parsers ───────────────────────────────────────────────────

/**
 * Multi-strategy parsing: try structured first, fall back to unstructured.
 * Pick the strategy that finds the most records.
 */
function parseTextContent(
  text: string,
  targetMonth?: number,
  targetYear?: number
): ParsedTransaction[] {
  console.log(`[Parser] Text length: ${text.length} chars, lines: ${text.split('\n').length}`);

  // Strategy 1: Try structured (CSV/TSV with headers)
  const structured = extractFromStructuredData(text, targetMonth, targetYear);
  console.log(`[Parser] Structured strategy found: ${structured.length} records`);

  // Strategy 2: Try unstructured (line-by-line date+amount scanning)
  const unstructured = extractFromUnstructuredText(text, targetMonth, targetYear);
  console.log(`[Parser] Unstructured strategy found: ${unstructured.length} records`);

  // Use whichever found more records
  const best = structured.length >= unstructured.length ? structured : unstructured;
  console.log(`[Parser] Using ${structured.length >= unstructured.length ? 'structured' : 'unstructured'} strategy: ${best.length} records`);

  return best;
}

// ─── Column-aware PDF parsing ───────────────────────────────────────

interface PdfTextItem { str: string; x: number; y: number; width: number }
interface PdfRow { y: number; items: PdfTextItem[] }
interface ColumnMapping {
  dateRange: [number, number];
  descRange: [number, number];
  debitRange?: [number, number];
  creditRange?: [number, number];
  amountRange?: [number, number];
  balanceRange?: [number, number];
}

// Use the same flexible alias approach for PDF headers
const PDF_DATE_ALIASES = [
  'date', 'transaction date', 'trans date', 'txn date', 'value date',
  'posting date', 'posted date', 'post date', 'entry date', 'book date',
  'trn date', 'trans', // "Trans" alone (some banks split "Trans Date" across rows)
];
const PDF_DESC_ALIASES = [
  'description', 'narration', 'particulars', 'particular', 'details',
  'detail', 'remarks', 'remark', 'reference', 'narrative', 'memo',
];
const PDF_DEBIT_ALIASES = [
  'debit', 'debit amount', 'withdrawal', 'withdrawals', 'outflow',
  'dr', 'money out', 'charges', 'charge', 'expense', 'out', 'payment', 'spent',
];
const PDF_CREDIT_ALIASES = [
  'credit', 'credit amount', 'deposit', 'deposits', 'inflow',
  'cr', 'money in', 'lodgement', 'lodgements', 'income', 'in', 'received', 'earned',
];
const PDF_AMOUNT_ALIASES = [
  'amount', 'transaction amount', 'txn amount', 'value', 'sum',
];
const PDF_BALANCE_ALIASES = [
  'balance', 'closing balance', 'running balance', 'available balance',
  'book balance', 'ledger balance', 'closing bal', 'bal',
];

/**
 * Check if a PDF text item matches any of the given aliases.
 */
function matchesPdfAlias(text: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(text);
  if (!normalized) return false;
  for (const alias of aliases) {
    const na = normalizeHeader(alias);
    if (normalized === na) return true;
    if (normalized.startsWith(na)) return true;
    if (na.length >= 3 && normalized.includes(na)) return true;
  }
  // Word-boundary match for short terms like "dr", "cr"
  for (const alias of aliases) {
    const na = normalizeHeader(alias);
    if (na.length < 3) {
      const re = new RegExp(`\\b${na}\\b`);
      if (re.test(normalized)) return true;
    }
  }
  return false;
}

/**
 * Merge two adjacent PDF rows into one combined row.
 * Items at similar X positions get their text concatenated with a space.
 * Items at unique X positions are kept as-is.
 */
function mergeAdjacentRows(row1: PdfRow, row2: PdfRow): PdfRow {
  const X_MERGE_TOLERANCE = 25;
  const merged: PdfTextItem[] = [];
  const usedRow2 = new Set<number>();

  // For each item in row1, try to find a matching item in row2 at a similar X
  for (const item1 of row1.items) {
    let bestMatch: PdfTextItem | null = null;
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < row2.items.length; j++) {
      if (usedRow2.has(j)) continue;
      const dist = Math.abs(item1.x - row2.items[j].x);
      if (dist < X_MERGE_TOLERANCE && dist < bestDist) {
        bestMatch = row2.items[j];
        bestIdx = j;
        bestDist = dist;
      }
    }
    if (bestMatch && bestIdx >= 0) {
      usedRow2.add(bestIdx);
      // Combine text: "Trans" + "Date" => "Trans Date"
      merged.push({
        str: `${item1.str} ${bestMatch.str}`.trim(),
        x: item1.x,
        y: item1.y,
        width: Math.max(item1.width, bestMatch.width),
      });
    } else {
      merged.push({ ...item1 });
    }
  }

  // Add any unmatched items from row2
  for (let j = 0; j < row2.items.length; j++) {
    if (!usedRow2.has(j)) {
      merged.push({ ...row2.items[j] });
    }
  }

  merged.sort((a, b) => a.x - b.x);
  return { y: row1.y, items: merged };
}

function detectColumns(headerRow: PdfRow): ColumnMapping | null {
  const items = headerRow.items.sort((a, b) => a.x - b.x);

  let dateCol: PdfTextItem | null = null;
  let descCol: PdfTextItem | null = null;
  let debitCol: PdfTextItem | null = null;
  let creditCol: PdfTextItem | null = null;
  let amountCol: PdfTextItem | null = null;
  let balanceCol: PdfTextItem | null = null;

  for (const item of items) {
    const t = item.str;
    if (!dateCol && matchesPdfAlias(t, PDF_DATE_ALIASES)) dateCol = item;
    else if (!descCol && matchesPdfAlias(t, PDF_DESC_ALIASES)) descCol = item;
    else if (!debitCol && matchesPdfAlias(t, PDF_DEBIT_ALIASES)) debitCol = item;
    else if (!creditCol && matchesPdfAlias(t, PDF_CREDIT_ALIASES)) creditCol = item;
    else if (!amountCol && matchesPdfAlias(t, PDF_AMOUNT_ALIASES)) amountCol = item;
    else if (!balanceCol && matchesPdfAlias(t, PDF_BALANCE_ALIASES)) balanceCol = item;
  }

  if (!dateCol) return null; // Must have at least a date column

  // Build X ranges: each column extends from its X to the next column's X
  const allCols = items.map(i => i.x).sort((a, b) => a - b);
  const maxX = Math.max(...allCols) + 200;

  const getRange = (col: PdfTextItem): [number, number] => {
    const colX = col.x;
    // Find the next column start
    const nextCols = allCols.filter(x => x > colX + 10);
    const nextX = nextCols.length > 0 ? nextCols[0] : maxX;
    // Use generous tolerance: amounts are often right-aligned so they can
    // start well before the header text. Extend left by 40 and include up to
    // the next column boundary.
    return [colX - 40, nextX];
  };

  const mapping: ColumnMapping = {
    dateRange: getRange(dateCol),
    descRange: descCol ? getRange(descCol) : [dateCol.x + 80, maxX], // fallback
  };

  if (debitCol) mapping.debitRange = getRange(debitCol);
  if (creditCol) mapping.creditRange = getRange(creditCol);
  if (amountCol && !debitCol && !creditCol) mapping.amountRange = getRange(amountCol);
  if (balanceCol) mapping.balanceRange = getRange(balanceCol);

  console.log('[PDF Parser] Detected columns:', {
    date: dateCol?.str,
    desc: descCol?.str,
    debit: debitCol?.str,
    credit: creditCol?.str,
    amount: amountCol?.str,
    balance: balanceCol?.str,
  });
  console.log('[PDF Parser] Column X ranges:', {
    date: mapping.dateRange,
    desc: mapping.descRange,
    debit: mapping.debitRange,
    credit: mapping.creditRange,
    amount: mapping.amountRange,
    balance: mapping.balanceRange,
  });

  return mapping;
}

function getValueInRange(row: PdfRow, range: [number, number]): string {
  return row.items
    .filter(item => item.x >= range[0] && item.x < range[1])
    .sort((a, b) => a.x - b.x)
    .map(i => i.str)
    .join(' ')
    .trim();
}

/**
 * Check if a row looks like it could be a header row for a transaction table.
 * Requires a date-like keyword + at least one amount-like keyword.
 */
function isPotentialHeaderRow(row: PdfRow): boolean {
  const hasDate = row.items.some(item => matchesPdfAlias(item.str, PDF_DATE_ALIASES));
  if (!hasDate) return false;

  const hasDebit = row.items.some(item => matchesPdfAlias(item.str, PDF_DEBIT_ALIASES));
  const hasCredit = row.items.some(item => matchesPdfAlias(item.str, PDF_CREDIT_ALIASES));
  const hasAmount = row.items.some(item => matchesPdfAlias(item.str, PDF_AMOUNT_ALIASES));
  const hasDesc = row.items.some(item => matchesPdfAlias(item.str, PDF_DESC_ALIASES));

  return (hasDebit || hasCredit || hasAmount) || hasDesc;
}

/**
 * Try to parse a date from text, and if it fails because of missing year/day,
 * combine with text from an adjacent row in the same column range.
 */
function parseDateWithFallback(
  row: PdfRow,
  nextRow: PdfRow | null,
  dateRange: [number, number]
): Date | null {
  const dateText = getValueInRange(row, dateRange);
  
  // Try direct parse first
  let date = parseDate(dateText) || findDateInText(dateText);
  if (date) return date;

  // Handle split dates: "01Jan" on this row + "2026" on next row
  if (nextRow && dateText) {
    const nextDateText = getValueInRange(nextRow, dateRange);
    if (nextDateText) {
      // Try combining: "01Jan" + "2026" => "01Jan 2026" or "01Jan2026"
      const combined1 = `${dateText} ${nextDateText}`;
      const combined2 = `${dateText}${nextDateText}`;
      date = parseDate(combined1) || findDateInText(combined1);
      if (date) return date;
      date = parseDate(combined2) || findDateInText(combined2);
      if (date) return date;
      
      // Also try reverse: maybe year is on this row and day+month on next
      const combined3 = `${nextDateText} ${dateText}`;
      date = parseDate(combined3) || findDateInText(combined3);
      if (date) return date;
    }
  }

  // Also try looking at ALL text in the row for a date (some PDFs scatter date parts)
  const allRowText = row.items.map(i => i.str).join(' ');
  date = findDateInText(allRowText);
  if (date) return date;

  return null;
}

/**
 * Validate that a candidate header is followed by actual transaction data.
 * Checks the next N rows for parseable dates in the date column range.
 * Uses multi-line date fallback for split dates like "01Jan" + "2026".
 */
function validateHeaderCandidate(
  allRows: PdfRow[],
  headerIdx: number,
  columns: ColumnMapping,
  minDataRows: number = 2
): number {
  let dataRowCount = 0;
  const checkLimit = Math.min(headerIdx + 20, allRows.length);

  for (let i = headerIdx + 1; i < checkLimit; i++) {
    const nextRow = i + 1 < allRows.length ? allRows[i + 1] : null;
    const date = parseDateWithFallback(allRows[i], nextRow, columns.dateRange);
    if (date) {
      dataRowCount++;
      if (dataRowCount >= minDataRows) return dataRowCount;
    }
  }

  return dataRowCount;
}

/**
 * Extract transactions from PDF rows using column-aware parsing.
 * Scans for ALL potential header rows (including multi-line headers),
 * validates each one by checking if actual transaction data follows it,
 * and uses the best candidate.
 */
function extractFromPdfRows(
  allRows: PdfRow[],
  targetMonth?: number,
  targetYear?: number
): { transactions: ParsedTransaction[]; headerFound: boolean } {
  // Find ALL potential header rows — check both single rows AND merged pairs
  const candidates: { idx: number; columns: ColumnMapping; score: number; spanRows: number }[] = [];

  for (let i = 0; i < allRows.length; i++) {
    // Strategy A: Single-row header
    if (isPotentialHeaderRow(allRows[i])) {
      const columns = detectColumns(allRows[i]);
      if (columns) {
        const dataRows = validateHeaderCandidate(allRows, i, columns);
        if (dataRows > 0) {
          const rowText = allRows[i].items.map(it => it.str).join(' ');
          console.log(`[PDF Parser] Header candidate (single) at row ${i}: "${rowText.substring(0, 100)}" (${dataRows} data rows follow)`);
          candidates.push({ idx: i, columns, score: dataRows, spanRows: 1 });
        }
      }
    }

    // Strategy B: Merged two-row header (e.g. "Trans\nDate" + "Value\nDate")
    if (i + 1 < allRows.length) {
      const merged = mergeAdjacentRows(allRows[i], allRows[i + 1]);
      if (isPotentialHeaderRow(merged)) {
        const columns = detectColumns(merged);
        if (columns) {
          // Start checking data from row i+2 (after both header rows)
          const dataRows = validateHeaderCandidate(allRows, i + 1, columns);
          if (dataRows > 0) {
            const rowText = merged.items.map(it => it.str).join(' ');
            console.log(`[PDF Parser] Header candidate (merged) at rows ${i}-${i + 1}: "${rowText.substring(0, 120)}" (${dataRows} data rows follow)`);
            candidates.push({ idx: i + 1, columns, score: dataRows, spanRows: 2 });
          }
        }
      }
    }
  }

  if (candidates.length === 0) {
    console.log('[PDF Parser] No valid header candidates found');
    return { transactions: [], headerFound: false };
  }

  // Deduplicate candidates that overlap (prefer merged over single if same position)
  const uniqueCandidates = candidates.sort((a, b) => b.score - a.score);

  // Try each candidate and use the one that yields the most transactions
  let bestTransactions: ParsedTransaction[] = [];
  let bestCandidateIdx = -1;

  for (let c = 0; c < uniqueCandidates.length; c++) {
    const { idx: headerIdx, columns } = uniqueCandidates[c];
    const transactions: ParsedTransaction[] = [];
    const seen = new Set<string>();

    // Determine where this table ends (next candidate's header or end)
    // Use a simple heuristic: process all remaining rows until we run out
    const endIdx = allRows.length;

    for (let i = headerIdx + 1; i < endIdx; i++) {
      const row = allRows[i];
      const nextRow = i + 1 < endIdx ? allRows[i + 1] : null;

      // Get date from the date column — with multi-line fallback
      const date = parseDateWithFallback(row, nextRow, columns.dateRange);
      if (!date) continue;

      // Filter by target period
      if (targetMonth !== undefined && targetYear !== undefined) {
        if (date.getMonth() !== targetMonth || date.getFullYear() !== targetYear) continue;
      }

      // Get description — also gather from continuation rows
      let description = getValueInRange(row, columns.descRange);
      // Check next rows for multi-line descriptions (until we find another date)
      let descLookahead = i + 1;
      while (descLookahead < endIdx && descLookahead <= i + 5) {
        const laRow = allRows[descLookahead];
        const laDate = parseDateWithFallback(laRow, descLookahead + 1 < endIdx ? allRows[descLookahead + 1] : null, columns.dateRange);
        if (laDate) break; // Next transaction starts
        
        const continuation = getValueInRange(laRow, columns.descRange);
        if (continuation && continuation.length > 1) {
          description += ' ' + continuation;
        }
        
        // Also check if amounts are on continuation rows
        // (some PDFs split transaction data across multiple lines)
        descLookahead++;
      }
      
      if (!description) description = 'Transaction';
      // Clean up description
      description = description.replace(/\s+/g, ' ').trim();

      // Get amounts — check current row AND nearby continuation rows
      let debitAmount = 0;
      let creditAmount = 0;

      // Collect amounts from the current row + continuation rows
      const amountRows = [row];
      for (let ar = i + 1; ar < descLookahead && ar < endIdx; ar++) {
        amountRows.push(allRows[ar]);
      }

      for (const amtRow of amountRows) {
        if (columns.debitRange && columns.creditRange) {
          const dText = getValueInRange(amtRow, columns.debitRange);
          const crText = getValueInRange(amtRow, columns.creditRange);
          const d = parseAmount(dText);
          const cr = parseAmount(crText);
          if (d > 0 && debitAmount === 0) debitAmount = d;
          if (cr > 0 && creditAmount === 0) creditAmount = cr;
        } else if (columns.amountRange) {
          const amt = parseAmount(getValueInRange(amtRow, columns.amountRange));
          if (amt > 0) {
            const type = inferType(description);
            if (type === 'inflow') creditAmount = amt;
            else debitAmount = amt;
          }
        }
        // Don't stop early — check all rows so we don't miss amounts on continuation lines
      }

      // Fallback: grab any number not in date/desc/balance columns
      if (debitAmount === 0 && creditAmount === 0) {
        for (const amtRow of amountRows) {
          for (const item of amtRow.items) {
            if (item.x >= columns.dateRange[0] && item.x < columns.dateRange[1]) continue;
            if (item.x >= columns.descRange[0] && item.x < columns.descRange[1]) continue;
            if (columns.balanceRange && item.x >= columns.balanceRange[0] && item.x < columns.balanceRange[1]) continue;
            const amt = parseAmount(item.str);
            if (amt > 0) {
              const type = inferType(description);
              if (type === 'inflow') creditAmount = amt;
              else debitAmount = amt;
              break;
            }
          }
          if (debitAmount > 0 || creditAmount > 0) break;
        }
      }

      const amount = debitAmount > 0 ? debitAmount : creditAmount;
      if (amount <= 0) continue;

      const type = inferType(description, debitAmount, creditAmount);
      const category = inferCategory(description, type);
      const dateStr = date.toISOString();

      const key = `${dateStr.split('T')[0]}|${amount.toFixed(2)}|${description.substring(0, 30).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      transactions.push({
        date: dateStr,
        description: description.substring(0, 200),
        amount: Math.round(amount * 100) / 100,
        type,
        category,
      });
    }

    console.log(`[PDF Parser] Candidate ${c} (row ${headerIdx}): extracted ${transactions.length} transactions`);

    if (transactions.length > bestTransactions.length) {
      bestTransactions = transactions;
      bestCandidateIdx = c;
    }

    // If we already found a good candidate with many records, no need to try others
    if (bestTransactions.length >= 10) break;
  }

  if (bestCandidateIdx >= 0) {
    console.log(`[PDF Parser] Using candidate ${bestCandidateIdx} (row ${uniqueCandidates[bestCandidateIdx].idx}) with ${bestTransactions.length} transactions`);
  }

  return { transactions: bestTransactions, headerFound: bestTransactions.length > 0 };
}

export async function parsePDFFile(
  file: File,
  targetMonth?: number,
  targetYear?: number
): Promise<ParseResult> {
  try {
    console.log(`[PDF Parser] Starting PDF parse with PDF.js: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    console.log(`[PDF Parser] PDF loaded: ${totalPages} page(s)`);

    // Extract text items with positions from ALL pages
    const allRows: PdfRow[] = [];
    const pageTexts: string[] = [];
    const Y_TOLERANCE = 3;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items: PdfTextItem[] = [];
      for (const item of textContent.items) {
        if (!('str' in item) || typeof (item as any).str !== 'string') continue;
        const ti = item as any;
        const str = ti.str?.trim();
        if (!str) continue;
        items.push({
          str,
          x: ti.transform?.[4] ?? 0,
          y: ti.transform?.[5] ?? 0,
          width: ti.width ?? str.length * 5,
        });
      }

      if (items.length === 0) continue;

      // Group items into rows by Y position
      const rowMap = new Map<number, PdfTextItem[]>();
      for (const item of items) {
        const y = Math.round(item.y);
        let matchedY = -1;
        for (const existingY of rowMap.keys()) {
          if (Math.abs(existingY - y) <= Y_TOLERANCE) { matchedY = existingY; break; }
        }
        const targetY = matchedY >= 0 ? matchedY : y;
        if (!rowMap.has(targetY)) rowMap.set(targetY, []);
        rowMap.get(targetY)!.push(item);
      }

      // Sort rows top-to-bottom
      const sortedYs = [...rowMap.keys()].sort((a, b) => b - a);
      for (const y of sortedYs) {
        const rowItems = rowMap.get(y)!.sort((a, b) => a.x - b.x);
        allRows.push({ y, items: rowItems });
      }

      // Also build plain text for fallback parsing
      const lines: string[] = [];
      for (const y of sortedYs) {
        const rowItems = rowMap.get(y)!.sort((a, b) => a.x - b.x);
        let line = '';
        let lastEndX = -Infinity;
        for (const item of rowItems) {
          if (line && item.x - lastEndX > 5) line += '  ';
          line += item.str;
          lastEndX = item.x + item.width;
        }
        if (line.trim()) lines.push(line.trim());
      }
      pageTexts.push(lines.join('\n'));

      console.log(`[PDF Parser] Page ${pageNum}: ${sortedYs.length} rows, ${items.length} text items`);
    }

    const fullText = pageTexts.join('\n');
    console.log(`[PDF Parser] Total: ${allRows.length} rows, ${fullText.length} chars`);
    if (fullText.length > 0) console.log(`[PDF Parser] Preview:\n${fullText.substring(0, 800)}`);

    if (!fullText || fullText.trim().length < 20) {
      return {
        transactions: [],
        rawText: fullText || '',
        error: 'Unable to extract data from this PDF. It may be a scanned image. Please manually add these transactions or try another PDF.',
      };
    }

    // Strategy 1: Column-aware parsing (uses X-position data from PDF)
    const pdfResult = extractFromPdfRows(allRows, targetMonth, targetYear);
    console.log(`[PDF Parser] Column-aware strategy: ${pdfResult.transactions.length} records (header found: ${pdfResult.headerFound})`);

    // Strategy 2: Text-based fallback
    const textResult = parseTextContent(fullText, targetMonth, targetYear);
    console.log(`[PDF Parser] Text-based fallback: ${textResult.length} records`);

    // Use column-aware if it found a header and extracted records, else fallback
    const transactions = (pdfResult.headerFound && pdfResult.transactions.length > 0)
      ? pdfResult.transactions
      : textResult;

    console.log(`[PDF Parser] Final: ${transactions.length} records using ${pdfResult.headerFound && pdfResult.transactions.length > 0 ? 'column-aware' : 'text fallback'}`);

    if (transactions.length === 0) {
      return {
        transactions: [],
        rawText: fullText,
        error: 'Unable to extract transaction data from this PDF. The format may not be recognized. Please manually add these transactions or try a CSV/Excel export from your bank.',
      };
    }

    return { transactions, rawText: fullText };
  } catch (err) {
    console.error('[PDF Parser] Error:', err);
    return {
      transactions: [],
      rawText: '',
      error: 'Unable to extract data from this PDF. Please manually add these transactions or try another PDF.',
    };
  }
}

export async function parseCSVFile(
  file: File,
  targetMonth?: number,
  targetYear?: number
): Promise<ParseResult> {
  try {
    const text = await file.text();
    console.log(`[CSV Parser] Read ${text.length} chars from ${file.name}`);
    const transactions = parseTextContent(text, targetMonth, targetYear);

    if (transactions.length === 0) {
      return { transactions: [], rawText: text, error: 'No transactions found in the CSV file for the selected period.' };
    }
    return { transactions, rawText: text };
  } catch (err) {
    console.error('[CSV Parser] Error:', err);
    return { transactions: [], rawText: '', error: 'Failed to read CSV file.' };
  }
}

/**
 * Parse an Excel cell value as a monetary amount.
 * When raw: true is used, numeric cells come as actual JavaScript numbers,
 * so we can use them directly without string parsing issues.
 */
function parseExcelAmount(value: string | number | boolean | undefined): number {
  if (value === null || value === undefined || value === '') return 0;

  // If it's already a number (raw: true gives us this), use it directly
  if (typeof value === 'number') {
    const num = Math.abs(value);
    return num > 0 ? Math.round(num * 100) / 100 : 0;
  }

  // Boolean
  if (typeof value === 'boolean') return 0;

  // Fall back to string parsing for formatted values
  return parseAmount(String(value));
}

// ─── Column-aware Excel parsing ─────────────────────────────────────

interface ExcelColumnMapping {
  dateCol: number;
  descCol: number;
  debitCol: number;
  creditCol: number;
  amountCol: number;
  typeCol: number;
  balanceCol: number;
}

/**
 * Normalize a header string for flexible comparison.
 * Lowercases, removes accents/diacritics, collapses whitespace/underscores.
 */
function normalizeHeader(header: string): string {
  if (!header) return '';
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents/diacritics
    .replace(/[₦$€£¥#]/g, 'n')     // Replace currency symbols with 'n' for matching
    .replace(/[_\-./\\]+/g, ' ')     // Replace separators with space
    .replace(/\s+/g, ' ')            // Collapse whitespace
    .trim();
}

// Aliases for each column type — order matters (most specific first)
// IMPORTANT: These must be actual HEADER labels, not words found in transaction descriptions.
// Keep aliases short and specific to avoid matching data cells.
const DATE_ALIASES = [
  'date', 'transaction date', 'trans date', 'txn date', 'value date',
  'posting date', 'posted date', 'post date', 'entry date', 'book date',
  'effective date', 'trn date', 'txn dt', 'val date',
  'created time', 'completed time', 'created date', 'completed date',
];
const DESC_ALIASES = [
  'description', 'narration', 'particulars', 'particular', 'details',
  'detail', 'remarks', 'remark', 'reference', 'transaction details',
  'trans description', 'txn description', 'transaction narration',
  'payment details', 'beneficiary', 'payee', 'merchant', 'memo',
  'transaction reference', 'narrative', 'transaction particular',
];
const DEBIT_ALIASES = [
  'debit', 'debit amount', 'debits', 'withdrawal', 'withdrawals',
  'outflow', 'dr', 'money out', 'amount debited', 'debit value',
  'payments out', 'debit(n)', 'debit (n)', 'debit(ngn)', 'debit (ngn)',
];
const CREDIT_ALIASES = [
  'credit', 'credit amount', 'credits', 'deposit', 'deposits',
  'inflow', 'cr', 'money in', 'amount credited', 'credit value',
  'lodgement', 'lodgements', 'payments in', 'receipts',
  'credit(n)', 'credit (n)', 'credit(ngn)', 'credit (ngn)',
];
const AMOUNT_ALIASES = [
  'amount', 'transaction amount', 'txn amount', 'sum',
  'transaction value', 'amount(n)', 'amount (n)', 'amount(ngn)', 'amount (ngn)',
];
const BALANCE_ALIASES = [
  'balance', 'closing balance', 'running balance', 'available balance',
  'book balance', 'ledger balance', 'closing bal', 'bal',
  'balance(n)', 'balance (n)', 'balance(ngn)', 'balance (ngn)',
];
const TYPE_ALIASES = [
  'type', 'txn type', 'transaction type', 'trans type', 'dr cr',
  'dr/cr', 'debit credit', 'debit/credit', 'channel',
];

/**
 * Find the best column index for a given set of aliases using multi-tier matching:
 * 1. Exact match
 * 2. Starts-with match
 * 3. Contains match (only for aliases ≥ 4 chars to avoid false positives)
 * 4. Word-boundary match for short aliases (dr, cr, bal)
 *
 * maxCellLength: reject cells longer than this (header cells should be short labels, not data).
 */
function findColumnIndex(
  normalizedHeaders: string[],
  aliases: string[],
  excludeIndices: Set<number> = new Set(),
  maxCellLength: number = 40
): number {
  const normalizedAliases = aliases.map(normalizeHeader);

  // Filter: skip cells that are too long to be headers
  const eligible = (h: string, i: number) => !excludeIndices.has(i) && h.length > 0 && h.length <= maxCellLength;

  // Priority 1: Exact match
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.findIndex((h, i) => eligible(h, i) && h === alias);
    if (idx !== -1) return idx;
  }

  // Priority 2: Starts-with match
  for (const alias of normalizedAliases) {
    const idx = normalizedHeaders.findIndex((h, i) => eligible(h, i) && h.startsWith(alias));
    if (idx !== -1) return idx;
  }

  // Priority 3: Contains match — only for aliases ≥ 4 chars to avoid greedy matching
  for (const alias of normalizedAliases) {
    if (alias.length < 4) continue;
    const idx = normalizedHeaders.findIndex((h, i) => eligible(h, i) && h.includes(alias));
    if (idx !== -1) return idx;
  }

  // Priority 4: Word-boundary match for short aliases (dr, cr, bal)
  for (const alias of normalizedAliases) {
    if (alias.length >= 4) continue; // Already handled above
    const re = new RegExp(`\\b${alias}\\b`);
    const idx = normalizedHeaders.findIndex((h, i) => eligible(h, i) && re.test(h));
    if (idx !== -1) return idx;
  }

  return -1;
}

function detectExcelHeaders(row: (string | number | boolean | undefined)[]): ExcelColumnMapping | null {
  const normalizedHeaders = row.map(cell => normalizeHeader(String(cell ?? '')));

  // Find columns in priority order — exclude already-claimed indices to avoid double-mapping
  const claimed = new Set<number>();

  const dateCol = findColumnIndex(normalizedHeaders, DATE_ALIASES, claimed);
  if (dateCol === -1) return null; // Must have at least a date column
  claimed.add(dateCol);

  const descCol = findColumnIndex(normalizedHeaders, DESC_ALIASES, claimed);
  if (descCol !== -1) claimed.add(descCol);

  const debitCol = findColumnIndex(normalizedHeaders, DEBIT_ALIASES, claimed);
  if (debitCol !== -1) claimed.add(debitCol);

  const creditCol = findColumnIndex(normalizedHeaders, CREDIT_ALIASES, claimed);
  if (creditCol !== -1) claimed.add(creditCol);

  const amountCol = findColumnIndex(normalizedHeaders, AMOUNT_ALIASES, claimed);
  if (amountCol !== -1) claimed.add(amountCol);

  const balanceCol = findColumnIndex(normalizedHeaders, BALANCE_ALIASES, claimed);
  if (balanceCol !== -1) claimed.add(balanceCol);

  const typeCol = findColumnIndex(normalizedHeaders, TYPE_ALIASES, claimed);

  const mapping: ExcelColumnMapping = {
    dateCol, descCol, debitCol, creditCol, amountCol, typeCol, balanceCol,
  };

  console.log('[Excel Parser] Detected columns:', {
    date: dateCol >= 0 ? `col ${dateCol} ("${row[dateCol]}")` : 'none',
    desc: descCol >= 0 ? `col ${descCol} ("${row[descCol]}")` : 'none',
    debit: debitCol >= 0 ? `col ${debitCol} ("${row[debitCol]}")` : 'none',
    credit: creditCol >= 0 ? `col ${creditCol} ("${row[creditCol]}")` : 'none',
    amount: amountCol >= 0 ? `col ${amountCol} ("${row[amountCol]}")` : 'none',
    balance: balanceCol >= 0 ? `col ${balanceCol} ("${row[balanceCol]}")` : 'none',
    type: typeCol >= 0 ? `col ${typeCol} ("${row[typeCol]}")` : 'none',
  });

  return mapping;
}

/**
 * Determines if a row looks like it could be a header row.
 * A header row must have mostly short text cells (not data),
 * plus recognizable column names for date AND debit/credit/amount.
 */
function isLikelyHeaderRow(row: (string | number | boolean | undefined)[]): boolean {
  const stringCells = row.filter(c => c !== undefined && c !== '').map(c => String(c));
  if (stringCells.length < 2) return false;

  // Header cells should be text labels. Reject rows where most cells are numbers.
  const numericCells = stringCells.filter(c => /^[\d,.\-\s₦$€£¥#()]+$/.test(c.trim()) && c.trim().length > 0);
  if (numericCells.length > stringCells.length * 0.6) return false;

  // Use a generous maxCellLength for matching (headers can be like "Debit Amount(₦)")
  const normalizedHeaders = row.map(cell => normalizeHeader(String(cell ?? '')));

  const hasDate = findColumnIndex(normalizedHeaders, DATE_ALIASES, new Set(), 60) !== -1;
  if (!hasDate) return false;

  const hasDebit = findColumnIndex(normalizedHeaders, DEBIT_ALIASES, new Set(), 60) !== -1;
  const hasCredit = findColumnIndex(normalizedHeaders, CREDIT_ALIASES, new Set(), 60) !== -1;
  const hasAmount = findColumnIndex(normalizedHeaders, AMOUNT_ALIASES, new Set(), 60) !== -1;

  return hasDebit || hasCredit || hasAmount;
}

/**
 * Content-based column detection fallback.
 * When header detection fails, scan data rows to identify:
 * - Which column has dates (parseable date values)
 * - Which columns have monetary amounts (numbers or "--")
 * Works even when there is NO header row at all (e.g. OPay exports).
 */
function detectHeaderByContent(
  rows: (string | number | boolean | undefined)[][]
): { headerIdx: number; columns: ExcelColumnMapping } | null {
  // First, check if the row above the first data row has header labels
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;

    let hasDate = false;
    for (let c = 0; c < Math.min(row.length, 3); c++) {
      const raw = row[c];
      const cellStr = String(raw ?? '').trim();
      if (!cellStr) continue;
      const numVal = Number(raw);
      if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) { hasDate = true; break; }
      if (parseDate(cellStr) || findDateInText(cellStr)) { hasDate = true; break; }
    }

    if (hasDate && i > 0) {
      const headerRow = rows[i - 1];
      if (headerRow && headerRow.length >= 3) {
        const headerStrings = headerRow.filter(h => h !== undefined && h !== '').map(h => String(h));
        const textCells = headerStrings.filter(h => /[a-zA-Z]/.test(h));
        if (textCells.length >= headerStrings.length * 0.4) {
          const columns = detectExcelHeaders(headerRow);
          if (columns && (columns.debitCol >= 0 || columns.creditCol >= 0 || columns.amountCol >= 0)) {
            const rowText = headerRow.map(h => String(h ?? '')).join(' | ');
            console.log(`[Excel Parser] Content-based: header at row ${i - 1}: "${rowText.substring(0, 150)}"`);
            return { headerIdx: i - 1, columns };
          }
        }
      }
      break;
    }
  }

  // If no header row was found above data, try HEADERLESS detection
  return detectColumnsWithoutHeaders(rows);
}

/**
 * Detect columns purely from data patterns when NO header row exists.
 * Scans data rows and classifies each column as date, amount, or text.
 * Then assigns debit/credit based on position of adjacent amount columns.
 */
function detectColumnsWithoutHeaders(
  rows: (string | number | boolean | undefined)[][]
): { headerIdx: number; columns: ExcelColumnMapping } | null {
  const sampleSize = Math.min(rows.length, 15);
  if (sampleSize < 2) return null;

  let maxCols = 0;
  for (let i = 0; i < sampleSize; i++) {
    if (rows[i]) maxCols = Math.max(maxCols, rows[i].length);
  }
  if (maxCols < 3) return null;

  // Classify each column by content
  const colTypes: { dates: number; amounts: number; dashes: number; text: number; total: number }[] = [];
  for (let c = 0; c < maxCols; c++) {
    colTypes.push({ dates: 0, amounts: 0, dashes: 0, text: 0, total: 0 });
  }

  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const raw = row[c];
      const cellStr = String(raw ?? '').trim();
      if (!cellStr) continue;

      colTypes[c].total++;

      // Dash/zero markers (common in bank statements for empty debit/credit)
      if (cellStr === '--' || cellStr === '—' || cellStr === '-' || cellStr === '0.00' || cellStr === '0') {
        colTypes[c].dashes++;
        colTypes[c].amounts++;
        continue;
      }

      // Excel serial date
      const numVal = Number(raw);
      if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
        colTypes[c].dates++;
        continue;
      }
      // Text date (short cell)
      if (cellStr.length < 30 && (parseDate(cellStr) || findDateInText(cellStr))) {
        colTypes[c].dates++;
        continue;
      }

      // Monetary amount
      if (typeof raw === 'number' && raw > 0) {
        colTypes[c].amounts++;
        continue;
      }
      const amt = parseAmount(cellStr);
      if (amt > 0 && /^[\d,.\s₦$€£¥#()\-]+$/.test(cellStr)) {
        colTypes[c].amounts++;
        continue;
      }

      // Text
      if (/[a-zA-Z]/.test(cellStr)) {
        colTypes[c].text++;
      }
    }
  }

  // Find date column
  const dateCol = colTypes.findIndex(c => c.total > 0 && c.dates / c.total > 0.5);
  if (dateCol === -1) return null;

  // Find amount columns
  const amountCols: number[] = [];
  for (let c = 0; c < maxCols; c++) {
    if (c === dateCol) continue;
    if (colTypes[c].total > 0 && colTypes[c].amounts / colTypes[c].total > 0.5) {
      amountCols.push(c);
    }
  }
  if (amountCols.length === 0) return null;

  // Find description column
  let descCol = -1;
  let maxText = 0;
  for (let c = 0; c < maxCols; c++) {
    if (c === dateCol || amountCols.includes(c)) continue;
    if (colTypes[c].text > maxText) {
      maxText = colTypes[c].text;
      descCol = c;
    }
  }

  // Assign debit/credit from amount columns
  let debitCol = -1, creditCol = -1, amountCol = -1, balanceCol = -1;

  if (amountCols.length >= 3) {
    debitCol = amountCols[0];
    creditCol = amountCols[1];
    balanceCol = amountCols[2];
  } else if (amountCols.length === 2) {
    debitCol = amountCols[0];
    creditCol = amountCols[1];
  } else {
    amountCol = amountCols[0];
  }

  console.log(`[Excel Parser] Headerless detection: date=col${dateCol}, desc=col${descCol}, debit=col${debitCol}, credit=col${creditCol}, amount=col${amountCol}, balance=col${balanceCol}`);
  console.log(`[Excel Parser] Column stats:`, colTypes.map((c, i) => `col${i}(d:${c.dates} a:${c.amounts} t:${c.text} dash:${c.dashes})`).join(', '));

  return {
    headerIdx: -1, // No header row — data starts at row 0
    columns: { dateCol, descCol, debitCol, creditCol, amountCol, typeCol: -1, balanceCol },
  };
}

function extractFromExcelRows(
  rows: (string | number | boolean | undefined)[][],
  targetMonth?: number,
  targetYear?: number
): { transactions: ParsedTransaction[]; headerFound: boolean } {
  let columns: ExcelColumnMapping | null = null;
  let headerIdx = -1;

  // Strategy 1: Look for a row that matches known header aliases
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (!rows[i] || rows[i].length < 2) continue;

    if (i < 5) {
      const rowPreview = rows[i].map(c => String(c ?? '')).join(' | ');
      console.log(`[Excel Parser] Checking row ${i}: "${rowPreview.substring(0, 120)}"`);
    }

    if (isLikelyHeaderRow(rows[i])) {
      columns = detectExcelHeaders(rows[i]);
      if (columns) {
        headerIdx = i;
        const rowText = rows[i].map(c => String(c ?? '')).join(' | ');
        console.log(`[Excel Parser] Header row found at row ${i}: "${rowText.substring(0, 150)}"`);
        break;
      }
    }
  }

  // Strategy 2: Content-based detection (checks row above data, then headerless)
  if (!columns) {
    console.log(`[Excel Parser] Alias-based detection failed, trying content-based detection`);
    const contentResult = detectHeaderByContent(rows);
    if (contentResult) {
      columns = contentResult.columns;
      headerIdx = contentResult.headerIdx;
    }
  }

  if (!columns) {
    console.log(`[Excel Parser] No columns detected at all`);
    return { transactions: [], headerFound: false };
  }

  const transactions: ParsedTransaction[] = [];
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // Get date
    const rawDateCell = row[columns.dateCol];
    const dateCell = String(rawDateCell ?? '').trim();
    if (!dateCell) continue;

    // Excel sometimes stores dates as serial numbers
    let date: Date | null = null;
    const numVal = Number(rawDateCell);
    if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
      // Excel serial date (days since 1899-12-30)
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + numVal * 86400000);
    } else {
      date = parseDate(dateCell) || findDateInText(dateCell);
    }
    if (!date) continue;

    // Filter by target period
    if (targetMonth !== undefined && targetYear !== undefined) {
      if (date.getMonth() !== targetMonth || date.getFullYear() !== targetYear) continue;
    }

    // Get description
    let description = columns.descCol >= 0 ? String(row[columns.descCol] ?? '').trim() : '';
    // If description is empty, check next row for continuation
    if (!description && i + 1 < rows.length) {
      const nextDateCell = String(rows[i + 1]?.[columns.dateCol] ?? '').trim();
      if (!nextDateCell || (!parseDate(nextDateCell) && !findDateInText(nextDateCell))) {
        description = columns.descCol >= 0 ? String(rows[i + 1]?.[columns.descCol] ?? '').trim() : '';
      }
    }
    if (!description) description = 'Transaction';

    // Get amounts from the correct columns
    let debitAmount = 0;
    let creditAmount = 0;

    if (columns.debitCol >= 0 && columns.creditCol >= 0) {
      debitAmount = parseExcelAmount(row[columns.debitCol]);
      creditAmount = parseExcelAmount(row[columns.creditCol]);
    } else if (columns.amountCol >= 0) {
      const amt = parseExcelAmount(row[columns.amountCol]);
      // Check type column hint if available
      const typeHint = columns.typeCol >= 0 ? String(row[columns.typeCol] ?? '').toLowerCase() : '';
      if (typeHint.includes('credit') || typeHint.includes('cr')) {
        creditAmount = amt;
      } else if (typeHint.includes('debit') || typeHint.includes('dr')) {
        debitAmount = amt;
      } else {
        const inferred = inferType(description);
        if (inferred === 'inflow') creditAmount = amt;
        else debitAmount = amt;
      }
    } else {
      // No debit/credit/amount column identified in the headers — skip this row.
      // We refuse to guess amounts from random cells; the header MUST tell us
      // which column holds the monetary values.
      continue;
    }

    const amount = debitAmount > 0 ? debitAmount : creditAmount;
    if (amount <= 0) continue;

    const type = inferType(description, debitAmount, creditAmount);
    const category = inferCategory(description, type);
    const dateStr = date.toISOString();

    const key = `${dateStr.split('T')[0]}|${amount.toFixed(2)}|${description.substring(0, 30).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    transactions.push({
      date: dateStr,
      description: description.substring(0, 200),
      amount: Math.round(amount * 100) / 100,
      type,
      category,
    });
  }

  return { transactions, headerFound: true };
}

export async function parseExcelFile(
  file: File,
  targetMonth?: number,
  targetYear?: number
): Promise<ParseResult> {
  try {
    console.log(`[Excel Parser] Starting Excel parse: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let allTransactions: ParsedTransaction[] = [];
    let headerFound = false;
    const csvParts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // Convert sheet to array of arrays for column-aware parsing
      // Use raw: true to get actual numeric values (avoids formatting issues with amounts)
      const sheetData: (string | number | boolean | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: '',
      });

      console.log(`[Excel Parser] Sheet "${sheetName}": ${sheetData.length} rows`);

      if (sheetData.length < 2) continue;

      // Strategy 1: Column-aware parsing from cell data
      const excelResult = extractFromExcelRows(sheetData, targetMonth, targetYear);
      console.log(`[Excel Parser] Column-aware: ${excelResult.transactions.length} records (header: ${excelResult.headerFound})`);

      if (excelResult.headerFound && excelResult.transactions.length > 0) {
        allTransactions = allTransactions.concat(excelResult.transactions);
        headerFound = true;
      }

      // Also generate CSV for fallback
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) csvParts.push(csv);
    }

    const fullCSV = csvParts.join('\n');

    // If column-aware parsing didn't find anything, fall back to STRUCTURED text-based parsing only
    // IMPORTANT: Do NOT use unstructured parsing for Excel — it grabs random numbers from descriptions
    if (!headerFound || allTransactions.length === 0) {
      console.log(`[Excel Parser] Column-aware parsing found no results, trying structured CSV fallback`);
      if (!fullCSV.trim()) {
        return { transactions: [], rawText: '', error: 'The Excel file appears to be empty.' };
      }
      // Only use structured (CSV header-based) parsing, NOT unstructured line-by-line
      const textTransactions = extractFromStructuredData(fullCSV, targetMonth, targetYear);
      console.log(`[Excel Parser] Structured CSV fallback: ${textTransactions.length} records`);
      if (textTransactions.length === 0) {
        return { transactions: [], rawText: fullCSV, error: 'No transactions found in the Excel file for the selected period. Make sure the file has column headers like Date, Debit, Credit.' };
      }
      return { transactions: textTransactions, rawText: fullCSV };
    }

    console.log(`[Excel Parser] Final: ${allTransactions.length} records using column-aware strategy`);
    return { transactions: allTransactions, rawText: fullCSV };
  } catch (err) {
    console.error('[Excel Parser] Error:', err);
    return { transactions: [], rawText: '', error: 'Failed to read Excel file. Make sure it is a valid .xls or .xlsx file.' };
  }
}

/**
 * Main entry: parse any supported statement file entirely client-side.
 * No AI, no server, no credits.
 */
export async function parseStatementClientSide(
  file: File,
  targetMonth: number, // 0-indexed
  targetYear: number
): Promise<ParseResult> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  const type = file.type;

  if (ext === 'pdf' || type === 'application/pdf') {
    return parsePDFFile(file, targetMonth, targetYear);
  }
  if (ext === 'csv' || type === 'text/csv') {
    return parseCSVFile(file, targetMonth, targetYear);
  }
  if (['xls', 'xlsx'].includes(ext) || type.includes('spreadsheet') || type.includes('excel')) {
    return parseExcelFile(file, targetMonth, targetYear);
  }

  return { transactions: [], rawText: '', error: 'Unsupported file format. Please upload a PDF, CSV, or Excel file.' };
}

/** All valid categories for a given type */
export function getValidCategories(type: RecordType): readonly string[] {
  if (type === 'inflow') return INFLOW_CATEGORIES;
  if (type === 'relief') return RELIEF_CATEGORIES;
  return OUTFLOW_CATEGORIES;
}
