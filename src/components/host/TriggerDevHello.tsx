"use client";

import { useEffect, useState } from "react";

type TriggerHelloResponse = {
  message?: string;
  runId?: string;
  code?: string;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string; runId: string }
  | { status: "error"; message: string };

export default function TriggerDevHello() {
  const [state, setState] = useState<State>({ status: "idle" });

  const ping = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/trigger/hello", { method: "POST" });
      const data = (await res.json()) as TriggerHelloResponse;
      if (!res.ok) {
        setState({
          status: "error",
          message: data.message ?? `Request failed (${res.status})`,
        });
        return;
      }
      setState({
        status: "success",
        message: data.message ?? "(empty)",
        runId: data.runId ?? "?",
      });
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  };

  useEffect(() => {
    ping();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "white",
        padding: "1.5rem",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        marginBottom: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", color: "#333", margin: 0 }}>
          trigger.dev connectivity check
        </h2>
        <button
          onClick={ping}
          disabled={state.status === "loading"}
          style={{
            padding: "0.4rem 0.9rem",
            fontSize: "0.85rem",
            backgroundColor:
              state.status === "loading" ? "#9ca3af" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: state.status === "loading" ? "not-allowed" : "pointer",
          }}
        >
          {state.status === "loading" ? "Pinging..." : "Ping"}
        </button>
      </div>

      {state.status === "idle" && (
        <div style={{ color: "#666", fontSize: "0.9rem" }}>Idle.</div>
      )}
      {state.status === "loading" && (
        <div style={{ color: "#666", fontSize: "0.9rem" }}>
          Triggering hello-world task...
        </div>
      )}
      {state.status === "success" && (
        <>
          <div
            style={{
              color: "#059669",
              fontSize: "0.9rem",
              marginBottom: "0.25rem",
            }}
          >
            OK — {state.message}
          </div>
          <div
            style={{
              color: "#9ca3af",
              fontSize: "0.75rem",
              fontFamily: "monospace",
            }}
          >
            run {state.runId}
          </div>
        </>
      )}
      {state.status === "error" && (
        <div style={{ color: "#dc2626", fontSize: "0.9rem" }}>
          Failed — {state.message}
        </div>
      )}
    </div>
  );
}
