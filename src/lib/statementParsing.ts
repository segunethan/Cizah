import { supabase } from '@/integrations/supabase/client';

type ParseStatementResult =
  | { ok: true; data: any; jobId?: string }
  | { ok: false; error: unknown };

const POLL_INTERVAL_MS = 2500;

function sanitizeFilename(name: string): string {
  return (name || 'statement')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

async function pollJob(
  jobId: string,
  onProgress?: (count: number) => void
): Promise<ParseStatementResult> {
  let lastCount = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5; // Only give up after repeated network failures

  // Poll indefinitely until done/error — no timeout
  while (true) {
    try {
      const { data, error } = await supabase.functions.invoke('parse-statement', {
        body: { jobId },
      });

      if (error) {
        consecutiveErrors++;
        console.warn(`Poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          return { ok: false, error: 'Lost connection while processing statement. Please try again.' };
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      // Reset error counter on success
      consecutiveErrors = 0;

      // Report progress (number of transactions so far)
      if (onProgress && Array.isArray(data?.transactions)) {
        const count = data.transactions.length;
        if (count > lastCount) {
          lastCount = count;
          onProgress(count);
        }
      }

      if (data?.status === 'done') {
        return { ok: true, data, jobId };
      }
      if (data?.status === 'error') {
        return { ok: false, error: data.error || 'Job failed' };
      }

      // Still running – wait then poll again
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    } catch (err) {
      consecutiveErrors++;
      console.warn(`Poll exception (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        return { ok: false, error: 'Lost connection while processing statement. Please try again.' };
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

export async function parseStatementViaFunction(params: {
  file: File;
  targetMonth: number; // 1-indexed
  targetYear: number;
  onProgress?: (count: number) => void;
}): Promise<ParseStatementResult> {
  const { file, targetMonth, targetYear, onProgress } = params;

  try {

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { ok: false, error: userError || new Error('Not authenticated') };
    }

    const userId = userData.user.id;
    const safeName = sanitizeFilename(file.name);
    const storagePath = `${userId}/statement-import/${Date.now()}-${safeName}`;

    // Upload to secure storage first (avoids sending huge base64 in the request)
    const { error: uploadError } = await supabase.storage
      .from('statements')
      .upload(storagePath, file, { upsert: true, contentType: file.type || undefined });

    if (uploadError) return { ok: false, error: uploadError };

    const { data, error } = await supabase.functions.invoke('parse-statement', {
      body: {
        storageBucket: 'statements',
        storagePath,
        fileName: file.name,
        fileType: file.type,
        targetMonth,
        targetYear,
      },
    });

    if (error) return { ok: false, error };

    // The function now returns a jobId immediately; poll for results
    if (data?.jobId) {
      const pollResult = await pollJob(data.jobId, onProgress);
      // Cleanup storage after completion
      if (pollResult.ok) {
        await supabase.storage.from('statements').remove([storagePath]);
      }
      return pollResult;
    }

    // Fallback for legacy synchronous response
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}
