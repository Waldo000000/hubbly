import { NextResponse } from "next/server";
import { tasks, runs } from "@trigger.dev/sdk/v3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { helloWorldTask } from "@/trigger/hello-world";

export const dynamic = "force-dynamic";

const TERMINAL_FAILURES = new Set([
  "FAILED",
  "CANCELED",
  "TIMED_OUT",
  "CRASHED",
  "INTERRUPTED",
  "SYSTEM_FAILURE",
]);

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const handle = await tasks.trigger<typeof helloWorldTask>(
      "hello-world",
      {},
    );

    const start = Date.now();
    const timeoutMs = 30_000;

    while (Date.now() - start < timeoutMs) {
      const run = await runs.retrieve(handle.id);
      if (run.status === "COMPLETED") {
        const output = run.output as { message?: string } | undefined;
        return NextResponse.json({
          message: output?.message ?? "(empty)",
          runId: handle.id,
        });
      }
      if (TERMINAL_FAILURES.has(run.status)) {
        return NextResponse.json(
          {
            code: "TASK_FAILED",
            message: `Run ended with status ${run.status}`,
            runId: handle.id,
          },
          { status: 502 },
        );
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    return NextResponse.json(
      {
        code: "TIMEOUT",
        message: "Timed out waiting for hello-world task",
        runId: handle.id,
      },
      { status: 504 },
    );
  } catch (error) {
    logger.error("Error triggering hello-world task", error, {
      endpoint: "POST /api/trigger/hello",
    });
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: msg },
      { status: 500 },
    );
  }
}
