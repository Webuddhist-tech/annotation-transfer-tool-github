import { analyzeSource, transferDetailed } from "fast-antx-js";
import type { AnnotationPattern } from "fast-antx-js";

import type { WorkerRequest, WorkerResponse } from "@/lib/worker-protocol";

function reply(message: WorkerResponse) {
  self.postMessage(message);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.kind === "analyze") {
      const rules = analyzeSource(request.source, request.rules as AnnotationPattern[]);
      reply({ id: request.id, ok: true, kind: "analyze", rules });
      return;
    }
    const result = transferDetailed(
      request.source,
      request.patterns as AnnotationPattern[],
      request.target,
    );
    reply({ id: request.id, ok: true, kind: "transfer", ...result });
  } catch (error) {
    reply({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
