import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5/xlsx.mjs';

/**
 * Convert an Excel file (base64-encoded) into CSV text for AI processing.
 * Gemini does not support Excel MIME types, so we parse server-side first.
 */
function excelBase64ToCSV(base64Content: string): string {
  const binaryStr = atob(base64Content);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const workbook = XLSX.read(bytes, { type: 'array', dense: true });

  // Combine all sheets into one CSV string
  const csvParts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      csvParts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    }
  }
  return csvParts.join('\n\n');
}

// Enables background tasks that continue after HTTP response
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

// Parallel chunk settings for fast extraction
const PARALLEL_CHUNKS = 4; // Number of parallel AI requests
const MAX_RETRIES = 2; // Retries per chunk on failure
const AI_TIMEOUT_MS = 75000; // 75s timeout per AI call (PDFs can be slow)

// CORS headers - allow all origins for edge function accessibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-demo-mode, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowed file types for server-side validation
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];
const ALLOWED_EXTENSIONS = ['.pdf', '.csv', '.xls', '.xlsx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function stripCodeFences(text: string): string {
  const t = (text || '').trim();
  if (!t.startsWith('```')) return t;
  return t
    .replace(/^```[a-zA-Z0-9_-]*\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();
}

function removeTrailingCommas(jsonLike: string): string {
  return (jsonLike || '').replace(/,\s*([\]}])/g, '$1');
}

function contentToString(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  // Some providers may return an array of parts: [{type:'text', text:'...'}]
  if (Array.isArray(raw)) {
    return raw
      .map((p: any) => (typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();
  }
  // Fallback
  try {
    return String(raw);
  } catch {
    return '';
  }
}

function tryParseJsonArray(text: string): any[] | null {
  const cleaned = stripCodeFences(text);

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const candidate = cleaned.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      try {
        const fixed = removeTrailingCommas(candidate);
        const parsed = JSON.parse(fixed);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        // fall through
      }
    }
  }

  // Sometimes models return {"transactions": [...]}
  try {
    const obj = JSON.parse(removeTrailingCommas(cleaned));
    if (obj && Array.isArray(obj.transactions)) return obj.transactions;
  } catch {
    // ignore
  }

  return null;
}

function extractBalancedJsonObjects(text: string): string[] {
  const out: string[] = [];
  const s = stripCodeFences(text);
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '{') {
      i++;
      continue;
    }

    const start = i;
    let depth = 0;
    let inString = false;
    let stringQuote: '"' | "'" | null = null;
    let escaped = false;

    for (; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (stringQuote && ch === stringQuote) {
          inString = false;
          stringQuote = null;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        stringQuote = ch as any;
        continue;
      }

      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          out.push(s.slice(start, i + 1));
          i++; // move past this object
          break;
        }
      }
    }

    // If we reached end-of-string without closing, stop (likely truncation)
    if (depth !== 0) break;
  }
  return out;
}

function normalizeTransaction(tx: any): any | null {
  if (!tx || typeof tx !== 'object') return null;
  const amount = Number(tx.amount);
  const date = typeof tx.date === 'string' ? tx.date : '';
  const type = typeof tx.type === 'string' ? tx.type : '';
  const category = typeof tx.category === 'string' ? tx.category : 'Others';
  const description = typeof tx.description === 'string' ? tx.description : '';

  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!date || date.length < 8) return null;
  if (!type) return null;

  return { type, category, amount, description, date };
}

function parseTransactionsFromAiContent(content: string):
  | { ok: true; transactions: any[]; partial: boolean; warning?: string }
  | { ok: false; error: string } {
  const direct = tryParseJsonArray(content);
  if (direct) {
    const normalized = direct.map(normalizeTransaction).filter(Boolean);
    return { ok: true, transactions: normalized, partial: false };
  }

  // Salvage mode: extract as many complete JSON objects as possible.
  const objs = extractBalancedJsonObjects(content);
  const salvaged: any[] = [];
  for (const objStr of objs) {
    try {
      const parsed = JSON.parse(removeTrailingCommas(objStr));
      const normalized = normalizeTransaction(parsed);
      if (normalized) salvaged.push(normalized);
    } catch {
      // ignore individual failures
    }
  }

  if (salvaged.length > 0) {
    return {
      ok: true,
      transactions: salvaged,
      partial: true,
      warning:
        'Imported a partial set of transactions because the AI output was truncated. For best results, export a shorter statement range (just the target month) and re-upload.',
    };
  }

  return {
    ok: false,
    error:
      'Could not extract transactions from the document. This can happen if the statement is very long (output truncation) or the PDF is unclear. Try exporting a shorter statement range (just the target month) and re-upload.',
  };
}

function isTruncatedFinishReason(finishReason: unknown): boolean {
  return finishReason === 'length' || finishReason === 'max_tokens';
}

function estimateBase64Bytes(base64: string): number {
  const clean = (base64 || '').replace(/\s/g, '');
  // '=' padding chars
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(clean.length * 0.75) - padding);
}

// Sanitize string for safe logging (remove potentially sensitive data)
function sanitizeForLog(str: string, maxLength = 50): string {
  if (!str) return '[empty]';
  const sanitized = str.replace(/[^\w\s.-]/g, '').substring(0, maxLength);
  return sanitized || '[invalid]';
}

function normalizeBase64(input: string): string {
  if (!input) return input;
  // Handles data URLs like: data:application/pdf;base64,AAAA...
  if (input.startsWith('data:')) {
    const commaIndex = input.indexOf(',');
    if (commaIndex >= 0) return input.slice(commaIndex + 1);
  }
  return input;
}

function peekBase64Ascii(inputBase64: string, maxChars = 8): string {
  try {
    const clean = (inputBase64 || '').replace(/\s/g, '');
    // Decode only a tiny prefix to avoid large allocations
    const prefix = clean.slice(0, 64);
    const decoded = atob(prefix);
    return decoded.slice(0, maxChars);
  } catch {
    return '';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POLL MODE: If body contains jobId, return existing job status
// ─────────────────────────────────────────────────────────────────────────────
async function handlePoll(body: any, userId: string, corsHdrs: Record<string, string>) {
  const jobId = body.jobId;
  if (!jobId || typeof jobId !== 'string') return null; // not poll mode

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: job, error: jobErr } = await admin
    .from('statement_parse_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (jobErr || !job) {
    return new Response(
      JSON.stringify({ success: false, error: 'Job not found' }),
      { status: 404, headers: { ...corsHdrs, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: job.status === 'done',
      jobId: job.id,
      status: job.status,
      transactions: job.transactions || [],
      extractionPasses: job.pass_count,
      partial: job.partial,
      warning: job.warning,
      error: job.error,
    }),
    { headers: { ...corsHdrs, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for demo mode header
    const isDemoMode = req.headers.get('x-demo-mode') === 'true';
    
    // Authentication check (skip for demo mode)
    const authHeader = req.headers.get('Authorization');
    let userId = 'demo-user';
    
    if (!isDemoMode) {
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('No valid Authorization header found');
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create Supabase client with the user's auth header
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      // Verify JWT using getClaims() which validates the token with signing-keys
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        console.log('JWT validation failed:', claimsError?.message || 'No claims found');
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      userId = claimsData.claims.sub as string;
    }

    console.log('Processing statement for user:', isDemoMode ? 'DEMO MODE' : userId.substring(0, 8) + '...');

    const {
      fileContent,
      storagePath,
      storageBucket,
      fileName,
      fileType,
      targetMonth,
      targetYear,
      jobId,
    } = await req.json();

    // ───────────────────────────────────────────────────────────────────────
    // POLL MODE: If client sends jobId, return current job status
    // ───────────────────────────────────────────────────────────────────────
    if (jobId && typeof jobId === 'string') {
      const pollRes = await handlePoll({ jobId }, userId, corsHeaders);
      if (pollRes) return pollRes;
    }

    const bucket = typeof storageBucket === 'string' && storageBucket.trim() ? storageBucket : 'statements';

    // Server-side input validation
    if ((!fileContent || typeof fileContent !== 'string') && (!storagePath || typeof storagePath !== 'string')) {
      return new Response(
        JSON.stringify({ success: false, error: 'File content or storage path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If a storagePath is provided, download the file server-side to avoid huge client payloads.
    let resolvedFileContent: string | null = null;
    if (storagePath && typeof storagePath === 'string') {
      if (!isDemoMode) {
        if (!storagePath.startsWith(`${userId}/`)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid file path' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!serviceKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
        return new Response(
          JSON.stringify({ success: false, error: 'Storage access not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Downloading statement from storage:', bucket, sanitizeForLog(storagePath, 80));

      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        serviceKey,
      );

      const { data: downloaded, error: downloadError } = await admin.storage
        .from(bucket)
        .download(storagePath);

      if (downloadError || !downloaded) {
        console.error('Storage download error:', downloadError?.message || 'No data');
        return new Response(
          JSON.stringify({ success: false, error: 'Could not read uploaded statement file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const buf = new Uint8Array(await downloaded.arrayBuffer());
      if (buf.byteLength > MAX_FILE_SIZE) {
        return new Response(
          JSON.stringify({ success: false, error: 'File too large. Maximum size is 10MB.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert to base64 (what our downstream parsing expects)
      resolvedFileContent = encodeBase64(buf);
    }

    // Use direct content when provided
    if (!resolvedFileContent && fileContent && typeof fileContent === 'string') {
      resolvedFileContent = fileContent;
    }

    if (!resolvedFileContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'File content could not be resolved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size (check base64 or text content length)
    const approxBytes = estimateBase64Bytes(resolvedFileContent);
    if (approxBytes > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ success: false, error: 'File too large. Maximum size is 10MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type by MIME type or file extension
    const fileExtension = fileName ? fileName.toLowerCase().substring(fileName.lastIndexOf('.')) : '';
    const isValidType = (fileType && ALLOWED_FILE_TYPES.includes(fileType)) || ALLOWED_EXTENSIONS.includes(fileExtension);
    
    if (!isValidType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid file type. Allowed: PDF, Excel (.xls, .xlsx), CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate fileName if provided (sanitize for logging)
    const safeFileName = sanitizeForLog(fileName || 'unknown');

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('AI service configuration error');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Target month:', targetMonth, 'Target year:', targetYear);
    console.log('File type:', fileType, 'File name:', safeFileName);

    // Build month name for filtering
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'];
    const targetMonthName = targetMonth && targetYear 
      ? `${monthNames[targetMonth - 1]} ${targetYear}` 
      : 'the current month';
    const targetMonthNum = targetMonth || new Date().getMonth() + 1;
    const targetYearNum = targetYear || new Date().getFullYear();

    const systemPrompt = `You are a financial statement parser for a Nigerian ministry finance app called Onyx. 
Your job is to extract REAL financial transactions from bank statements, receipts, or financial documents.

CRITICAL RULES:
1. ONLY extract transactions that are ACTUALLY present in the document
2. DO NOT make up, generate, or invent any transactions
3. If the document has NO transactions for ${targetMonthName}, return an empty array []
4. Extract EXACT amounts, dates, and descriptions as they appear in the document

FILTER: Only extract transactions from ${targetMonthName} (month ${targetMonthNum}, year ${targetYearNum}).
Ignore transactions from other months/years completely.

For each REAL transaction you find, extract:
1. type: Determine from the description/narration:
   - "inflow" = money received (salary, credit, deposit, transfer in, payment received)
   - "outflow" = money spent (debit, withdrawal, transfer out, payment made, purchase)
   - "relief" = tax reliefs and statutory deductions (pension, NHF, NHIS, mortgage interest, life insurance, etc.)
2. amount: The EXACT amount in Naira from the document (positive number only)
3. date: The EXACT transaction date in YYYY-MM-DD format
4. description: The EXACT narration/description from the statement

How to determine type from description:
- Contains "SALARY", "CREDIT", "DEPOSIT", "TRF FROM", "RECEIVED" → inflow
- Contains "DEBIT", "POS", "ATM", "TRF TO", "TRANSFER", "WITHDRAWAL", "PAYMENT" → outflow
- Contains "PENSION", "TAX", "NHF", "NHIS", "DEDUCTION", "INSURANCE", "MORTGAGE" → relief

5. category: Best guess based on description:
   - For inflows: "Voluntary Gifts", "Honourarium", "Prophet Offerings", "Salary", "Others"
   - For outflows: "Electricity and Data", "Material, Fuel, Feeding, and Travels", "Tithe, Offerings, Gifts/Givings", "Rent and Maintenance (Housing)", "Repairs/Maintenance (Vehicle)", "School Fees", "Transfer", "Others"
   - For reliefs: "NHF", "Pension", "NHIS", "Mortgage Interest", "Life Insurance/Annuity Premium", "Type of Apartments", "Apartments Own Type"

Return ONLY a valid JSON array. No explanations, just the JSON.
If NO transactions exist for ${targetMonthName} in the document, return: []

Example format:
[
  {"type": "inflow", "category": "Salary", "amount": 150000, "description": "SALARY PAYMENT FOR DEC", "date": "${targetYearNum}-${String(targetMonthNum).padStart(2, '0')}-25"},
  {"type": "outflow", "category": "Transfer", "amount": 5000, "description": "TRF TO JOHN DOE", "date": "${targetYearNum}-${String(targetMonthNum).padStart(2, '0')}-14"}
]`;

    // Determine if this is a binary file (PDF/Excel) that needs multimodal processing
    const isPDF = fileType === 'application/pdf' || fileExtension === '.pdf';
    const isExcel = fileType?.includes('spreadsheet') || fileType?.includes('excel') || 
                    fileExtension === '.xls' || fileExtension === '.xlsx';
    const isCSV = fileType === 'text/csv' || fileExtension === '.csv';

    // Frontend sends base64 (without data: prefix); keep a robust normalizer here too.
    const base64Content = normalizeBase64(resolvedFileContent).replace(/\s/g, '');

    let messages: any[];
    let modelToUse = 'google/gemini-2.5-pro'; // Use pro model for better document handling
    
    if (isPDF) {
      // For PDFs - use image_url with data URL (OpenAI-compatible format supported by Gemini)
      console.log('Processing as PDF document with image_url data URL...');
      const dataUrl = `data:application/pdf;base64,${base64Content}`;
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: `Extract all REAL financial transactions from this bank statement document for ${targetMonthName}. Only extract what actually exists in the document. If there are no transactions for ${targetMonthName}, return an empty array [].` },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        }
      ];
    } else if (isCSV) {
      // For CSV, decode from base64 first since we send files as base64
      console.log('Processing as CSV text...');
      let csvText = fileContent;
      try {
        csvText = atob(base64Content);
      } catch {
        // If decoding fails, content might already be plain text
        console.log('CSV content appears to already be plain text');
      }
      console.log('CSV content preview (first 500 chars):', csvText.substring(0, 500));
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract all REAL financial transactions from this CSV bank statement for ${targetMonthName}. Only extract what actually exists:\n\n${csvText}` }
      ];
    } else if (isExcel) {
      // For Excel - parse server-side with SheetJS then send as text (Gemini rejects xlsx MIME)
      console.log('Processing Excel: converting to CSV with SheetJS...');
      let csvText = '';
      try {
        csvText = excelBase64ToCSV(base64Content);
      } catch (e) {
        console.error('SheetJS parse error:', e instanceof Error ? e.message : String(e));
        return new Response(
          JSON.stringify({ success: false, error: 'Could not read Excel file. Make sure it is a valid .xls or .xlsx file.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Excel converted to CSV, length:', csvText.length, 'chars. Preview:', csvText.substring(0, 300));
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract all REAL financial transactions from this bank statement (converted from Excel) for ${targetMonthName}. Only extract what actually exists:\n\n${csvText}` }
      ];
    } else {
      // Fallback - treat as text
      console.log('Processing as plain text...');
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract all REAL financial transactions from this document for ${targetMonthName}:\n\n${fileContent}` }
      ];
    }

    // Quick sanity-checks before calling AI
    if (isPDF) {
      const head = peekBase64Ascii(base64Content, 5);
      if (head !== '%PDF-') {
        console.error('PDF header check failed. Got:', JSON.stringify(head));
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid PDF file content. Please upload a valid PDF bank statement.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Using model:', modelToUse);

    // ───────────────────────────────────────────────────────────────────────
    // START BACKGROUND JOB: insert job row then return immediately for polling
    // ───────────────────────────────────────────────────────────────────────
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey);

    const { data: jobRow, error: insertErr } = await adminClient
      .from('statement_parse_jobs')
      .insert({
        user_id: userId,
        storage_bucket: bucket,
        storage_path: storagePath || '',
        file_name: safeFileName,
        file_type: fileType || null,
        target_month: targetMonthNum,
        target_year: targetYearNum,
        status: 'running',
        pass_count: 0,
        transactions: [],
        partial: true,
      })
      .select('id')
      .single();

    if (insertErr || !jobRow) {
      console.error('Failed to create job row', insertErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create parsing job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newJobId = jobRow.id as string;
    console.log('Created job', newJobId);

    // ───────────────────────────────────────────────────────────────────────
    // PARALLEL CHUNK EXTRACTION: Fire multiple AI requests simultaneously
    // ───────────────────────────────────────────────────────────────────────
    async function runExtractionJob() {
      console.log('[BG] Starting extraction for job', newJobId);

      // Helper: call AI with retry and timeout
      async function callAI(aiMessages: any[], chunkLabel: string): Promise<{ transactions: any[]; partial: boolean; warning?: string }> {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: modelToUse,
                messages: aiMessages,
                temperature: 0,
                max_tokens: 16384, // Higher limit for more transactions
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const errorBody = await response.text();
              console.error(`[BG] ${chunkLabel} attempt ${attempt + 1} failed: ${response.status} - ${errorBody}`);

              // Fail fast on credit/quota errors (won't recover with retries)
              try {
                const parsed = JSON.parse(errorBody);
                if (parsed?.type === 'payment_required' || /not enough credits/i.test(parsed?.message || '')) {
                  throw new Error('Not enough credits to process statement');
                }
              } catch {
                // ignore
              }

              continue;
            }

            const aiResponse = await response.json();
            const finishReason = aiResponse.choices?.[0]?.finish_reason;
            const wasTruncated = isTruncatedFinishReason(finishReason);

            const rawContent = aiResponse.choices?.[0]?.message?.content;
            const content = contentToString(rawContent);

            if (!content || content.trim() === '') {
              console.log(`[BG] ${chunkLabel} attempt ${attempt + 1} returned empty content`);
              continue;
            }

            if (content.trim() === '[]') {
              return { transactions: [], partial: false };
            }

            const parsed = parseTransactionsFromAiContent(content);
            if (parsed.ok) {
              console.log(`[BG] ${chunkLabel} extracted ${parsed.transactions.length} transactions`);
              return {
                transactions: parsed.transactions,
                partial: parsed.partial || wasTruncated,
                warning: parsed.warning,
              };
            } else {
              console.log(`[BG] ${chunkLabel} attempt ${attempt + 1} parse failed: ${parsed.error}`);
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[BG] ${chunkLabel} attempt ${attempt + 1} error: ${errMsg}`);

            // Bubble up non-retryable errors
            if (/not enough credits/i.test(errMsg)) {
              throw err;
            }
          }
        }
        console.log(`[BG] ${chunkLabel} exhausted all retries`);
        return { transactions: [], partial: true, warning: `Failed to extract from ${chunkLabel}` };
      }

      try {
        // Ensure the job row gets touched early so polling doesn't look "stuck"
        await adminClient
          .from('statement_parse_jobs')
          .update({ status: 'running', pass_count: 0, transactions: [], partial: true, warning: 'Processing document...' })
          .eq('id', newJobId);

        // Build chunk prompts for parallel extraction
        // Each chunk asks the AI to extract a subset of transactions by position hint
        const chunkPrompts: { label: string; hint: string }[] = [];
        for (let i = 0; i < PARALLEL_CHUNKS; i++) {
          const startPct = Math.round((i / PARALLEL_CHUNKS) * 100);
          const endPct = Math.round(((i + 1) / PARALLEL_CHUNKS) * 100);
          chunkPrompts.push({
            label: `Chunk ${i + 1}/${PARALLEL_CHUNKS}`,
            hint: `Focus on extracting transactions from approximately ${startPct}% to ${endPct}% of the document (by position/page). Extract ALL transactions you see in this portion.`,
          });
        }

        // We'll merge results incrementally and persist as each chunk completes
        const seenKeys = new Set<string>();
        let mergedTransactions: any[] = [];
        let completedChunks = 0;
        let anyPartial = false;
        let lastWarning: string | null = null;

        const mergeTransactions = (txs: any[]) => {
          for (const tx of txs) {
            const key = `${tx.date}|${tx.amount}|${(tx.description || '').substring(0, 30)}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              mergedTransactions.push(tx);
            }
          }
        };

        const persistProgress = async (status: 'running' | 'done') => {
          mergedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          await adminClient
            .from('statement_parse_jobs')
            .update({
              status,
              pass_count: completedChunks,
              transactions: mergedTransactions,
              partial: anyPartial,
              warning: lastWarning,
            })
            .eq('id', newJobId);
        };

        // Build chunk tasks
        const chunkTasks = chunkPrompts.map(async ({ label, hint }) => {
          let chunkMessages: any[];
          const chunkSystemPrompt = systemPrompt + `\n\nSPECIAL INSTRUCTION: ${hint}`;

          if (isPDF) {
            const dataUrl = `data:application/pdf;base64,${base64Content}`;
            chunkMessages = [
              { role: 'system', content: chunkSystemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Extract financial transactions from this bank statement for ${targetMonthName}. ${hint}` },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ];
          } else if (isExcel) {
            // Excel already converted to CSV text above
            let csvText = '';
            try {
              csvText = excelBase64ToCSV(base64Content);
            } catch { csvText = resolvedFileContent || ''; }
            chunkMessages = [
              { role: 'system', content: chunkSystemPrompt },
              { role: 'user', content: `Extract financial transactions from this bank statement (converted from Excel) for ${targetMonthName}. ${hint}\n\n${csvText}` },
            ];
          } else if (isCSV) {
            let csvText = resolvedFileContent || '';
            try { csvText = atob(base64Content); } catch { /* already plain text */ }
            chunkMessages = [
              { role: 'system', content: chunkSystemPrompt },
              { role: 'user', content: `Extract financial transactions from this CSV for ${targetMonthName}. ${hint}\n\n${csvText}` },
            ];
          } else {
            chunkMessages = [
              { role: 'system', content: chunkSystemPrompt },
              { role: 'user', content: `Extract financial transactions from this document for ${targetMonthName}. ${hint}\n\n${resolvedFileContent || ''}` },
            ];
          }

          const result = await callAI(chunkMessages, label);
          completedChunks += 1;
          if (result.partial) anyPartial = true;
          if (result.warning) lastWarning = result.warning;
          else if (result.partial) lastWarning = 'Some chunks were truncated; re-uploading a shorter range can improve completeness.';

          if (result.transactions.length) mergeTransactions(result.transactions);
          await persistProgress('running');
          return result;
        });

        console.log(`[BG] Launching ${PARALLEL_CHUNKS} parallel AI requests...`);
        const startTime = Date.now();

        // Fire all chunks in parallel
        const chunkResults = await Promise.all(chunkTasks);

        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[BG] All chunks completed in ${elapsedSec}s`);

        void chunkResults; // computed above; progress is merged incrementally

        if (mergedTransactions.length === 0) {
          await adminClient
            .from('statement_parse_jobs')
            .update({ status: 'error', error: 'No transactions could be extracted from the document.', partial: true, warning: lastWarning })
            .eq('id', newJobId);
          return;
        }

        console.log(`[BG] Extraction complete: ${mergedTransactions.length} unique transactions in ${elapsedSec}s`);

        await persistProgress('done');

        console.log('[BG] Job finished', newJobId);
      } catch (err: unknown) {
        console.error('[BG] Job error', err instanceof Error ? err.message : String(err));
        await adminClient
          .from('statement_parse_jobs')
          .update({ status: 'error', error: err instanceof Error ? err.message : String(err), partial: false })
          .eq('id', newJobId);
      }
    }

    // Schedule background work then immediately return job id
    EdgeRuntime.waitUntil(runExtractionJob());

    return new Response(
      JSON.stringify({ success: true, jobId: newJobId, status: 'running' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Statement processing error occurred:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process statement' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
