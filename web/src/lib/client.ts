import type { MissingMarker, RuleAnalysis } from "fast-antx-js";

import type { RulePair, WorkerRequest, WorkerResponse } from "@/lib/worker-protocol";

export interface TransferRequest {
  source: string;
  target: string;
  patterns: RulePair[];
}

export interface TransferResult {
  text: string;
  placed: number;
  missing: MissingMarker[];
}

function createWorker(): Worker {
  return new Worker(new URL("../worker/transfer.worker.ts", import.meta.url), {
    type: "module",
  });
}

let nextId = 1;

/**
 * Run one transfer in a fresh worker. The worker is terminated afterwards so a
 * long diff never keeps the page busy once the result is in.
 */
export function transferAnnotations(
  request: TransferRequest,
): Promise<TransferResult> {
  const worker = createWorker();
  const id = nextId++;

  return new Promise((resolve, reject) => {
    const stop = () => worker.terminate();

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      stop();
      const data = event.data;
      if (!data.ok) {
        reject(new Error(data.error));
        return;
      }
      if (data.kind !== "transfer") {
        reject(new Error("Unexpected worker reply"));
        return;
      }
      resolve({ text: data.text, placed: data.placed, missing: data.missing });
    };

    worker.onerror = (event) => {
      stop();
      reject(new Error(event.message || "Transfer worker failed"));
    };

    const message: WorkerRequest = {
      id,
      kind: "transfer",
      source: request.source,
      target: request.target,
      patterns: request.patterns,
    };
    worker.postMessage(message);
  });
}

let analysisWorker: Worker | null = null;
let latestAnalysisId = 0;
let pendingAnalysis: {
  id: number;
  resolve: (value: RuleAnalysis[] | null) => void;
  reject: (reason: Error) => void;
} | null = null;

function resetAnalysisWorker() {
  analysisWorker?.terminate();
  analysisWorker = null;
}

/**
 * Analyze the rules against the source in a shared worker.
 * Only the newest request is answered; an older one resolves with `null`.
 * A request that outlives the worker (for instance a pathological regex)
 * is cancelled when the next request restarts it.
 */
export function analyzeRules(
  source: string,
  rules: RulePair[],
): Promise<RuleAnalysis[] | null> {
  const id = ++latestAnalysisId;

  if (pendingAnalysis) {
    // A previous analysis is still running. Drop it and start fresh so a slow
    // pattern cannot block the newer one.
    pendingAnalysis.resolve(null);
    pendingAnalysis = null;
    resetAnalysisWorker();
  }

  if (!analysisWorker) {
    analysisWorker = createWorker();
    analysisWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (!pendingAnalysis || data.id !== pendingAnalysis.id) return;
      const current = pendingAnalysis;
      pendingAnalysis = null;
      if (!data.ok) {
        current.reject(new Error(data.error));
        return;
      }
      if (data.kind !== "analyze") {
        current.reject(new Error("Unexpected worker reply"));
        return;
      }
      current.resolve(data.id === latestAnalysisId ? data.rules : null);
    };
    analysisWorker.onerror = (event) => {
      const current = pendingAnalysis;
      pendingAnalysis = null;
      resetAnalysisWorker();
      current?.reject(new Error(event.message || "Analysis worker failed"));
    };
  }

  return new Promise((resolve, reject) => {
    pendingAnalysis = { id, resolve, reject };
    const message: WorkerRequest = { id, kind: "analyze", source, rules };
    analysisWorker!.postMessage(message);
  });
}
