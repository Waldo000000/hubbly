"use client";

import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import type { GetSessionResponse } from "@/types/session";
import type { HostQuestionResponse } from "@/types/question";
import { fetcher } from "@/lib/swr-utils";
import HostQuestionList from "@/components/host/HostQuestionList";

export default function HostDashboardPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const code = params?.code as string;

  // UI state
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  // Redirect to sign in if not authenticated
  if (status === "unauthenticated") {
    signIn("google");
  }

  // Fetch session data with SWR
  const {
    data: sessionResponse,
    error: sessionError,
    isLoading: isLoadingSession,
    mutate: mutateSession,
  } = useSWR<GetSessionResponse>(
    status === "authenticated" && code ? `/api/sessions/${code}` : null,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    }
  );

  // Fetch questions with SWR
  const {
    data: questionsResponse,
    isLoading: isLoadingQuestions,
    mutate: mutateQuestions,
  } = useSWR<{ questions: HostQuestionResponse[] }>(
    status === "authenticated" && code ? `/api/sessions/${code}/host/questions` : null,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    }
  );

  const sessionData = sessionResponse?.session;
  const questions = questionsResponse?.questions || [];

  // Handle question status update with optimistic updates
  const handleQuestionStatusUpdate = async (
    questionId: string,
    newStatus: "being_answered" | "answered"
  ) => {
    // Optimistic update - update UI immediately
    mutateQuestions(
      (current) => {
        if (!current) return current;
        return {
          questions: current.questions.map((q) =>
            q.id === questionId ? { ...q, status: newStatus } : q
          ),
        };
      },
      { revalidate: false }
    );

    try {
      // Fire API request in background
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      // If API fails, revert the optimistic update
      if (!response.ok) {
        console.error("Failed to update question status");
        mutateQuestions(); // Force refresh from server to revert
      }
    } catch (error) {
      console.error("Network error updating question:", error);
      mutateQuestions(); // Force refresh from server to revert
    }
  };

  // Check for host ownership error
  const error =
    sessionError && session?.user?.id && sessionData?.hostId !== session.user.id
      ? "Access denied. You are not the host of this session."
      : sessionError
        ? sessionError.message
        : "";

  const isLoading = isLoadingSession;

  // Update session status with optimistic updates
  const updateSessionStatus = async (
    field: "isActive" | "isAcceptingQuestions",
    value: boolean,
  ) => {
    if (!sessionData) return;

    // Optimistic update
    mutateSession(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          session: {
            ...current.session,
            [field]: value,
          },
        };
      },
      { revalidate: false }
    );

    try {
      // Fire API request in background
      const response = await fetch(`/api/sessions/${code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });

      // If API fails, revert the optimistic update
      if (!response.ok) {
        console.error("Failed to update session status");
        mutateSession(); // Force refresh from server
      }
    } catch (error) {
      console.error("Network error updating session:", error);
      mutateSession(); // Force refresh from server
    }
  };

  // End session
  const endSession = async () => {
    if (!confirm("Are you sure you want to end this session?")) return;

    await updateSessionStatus("isActive", false);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    } catch {
      alert("Failed to copy to clipboard");
    }
  };

  // Generate shareable link
  const getShareableLink = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/session/${code}`;
    }
    return "";
  };

  // Generate QR code URL (using a free QR code API)
  const getQRCodeUrl = () => {
    const link = getShareableLink();
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              color: "#333",
            }}
          >
            Loading...
          </div>
          <div style={{ color: "#666" }}>Loading session dashboard</div>
        </div>
      </div>
    );
  }

  // Authentication required
  if (status === "unauthenticated") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              color: "#333",
            }}
          >
            Authentication Required
          </div>
          <div style={{ marginBottom: "2rem", color: "#666" }}>
            Please sign in to access the host dashboard
          </div>
          <button
            onClick={() => signIn("google")}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1.1rem",
              backgroundColor: "#4285f4",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !sessionData) {
    return (
      <div
        style={{
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "1.5rem",
            borderRadius: "8px",
            marginTop: "2rem",
          }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>Error</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push("/create")}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Create New Session
          </button>
        </div>
      </div>
    );
  }

  // Session data loaded
  if (!sessionData) return null;

  const shareableLink = getShareableLink();
  const qrCodeUrl = getQRCodeUrl();
  const isExpired = new Date() > new Date(sessionData.expiresAt);

  return (
    <main
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "0.5rem",
            color: "#333",
          }}
        >
          Host Dashboard
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#666" }}>
          Manage your Q&A session
        </p>
      </div>

      {/* Session Info Card */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            color: "#333",
          }}
        >
          Session Information
        </h2>

        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label
              style={{
                fontWeight: "bold",
                color: "#666",
                fontSize: "0.9rem",
              }}
            >
              Title
            </label>
            <div style={{ fontSize: "1.2rem", color: "#333" }}>
              {sessionData.title}
            </div>
          </div>

          {sessionData.description && (
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                Description
              </label>
              <div style={{ color: "#333" }}>{sessionData.description}</div>
            </div>
          )}

          <div>
            <label
              style={{
                fontWeight: "bold",
                color: "#666",
                fontSize: "0.9rem",
              }}
            >
              Session Code
            </label>
            <div
              style={{
                backgroundColor: "#f0fdf4",
                padding: "0.75rem 1rem",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#065f46",
                display: "inline-block",
                marginTop: "0.25rem",
              }}
            >
              {sessionData.code}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label
                style={{
                  fontWeight: "bold",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                Created
              </label>
              <div style={{ color: "#333" }}>
                {new Date(sessionData.createdAt).toLocaleString()}
              </div>
            </div>

            <div>
              <label
                style={{
                  fontWeight: "bold",
                  color: "#666",
                  fontSize: "0.9rem",
                }}
              >
                Expires
              </label>
              <div
                style={{
                  color: isExpired ? "#dc2626" : "#333",
                }}
              >
                {new Date(sessionData.expiresAt).toLocaleString()}
                {isExpired && " (Expired)"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Section */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            color: "#333",
          }}
        >
          Share with Participants
        </h2>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          {/* Shareable Link */}
          <div>
            <label
              style={{
                fontWeight: "bold",
                color: "#666",
                fontSize: "0.9rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              Shareable Link
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={shareableLink}
                readOnly
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: "#f9fafb",
                }}
              />
              <button
                onClick={() => copyToClipboard(shareableLink)}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Copy Link
              </button>
            </div>
            {showCopiedMessage && (
              <div
                style={{
                  color: "#059669",
                  fontSize: "0.9rem",
                  marginTop: "0.5rem",
                }}
              >
                Copied to clipboard!
              </div>
            )}
          </div>

          {/* QR Code */}
          <div>
            <label
              style={{
                fontWeight: "bold",
                color: "#666",
                fontSize: "0.9rem",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              QR Code
            </label>
            <div
              style={{
                display: "inline-block",
                padding: "1rem",
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            >
              <img
                src={qrCodeUrl}
                alt="Session QR Code"
                style={{
                  width: "200px",
                  height: "200px",
                  display: "block",
                }}
              />
            </div>
            <p
              style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.5rem" }}
            >
              Participants can scan this code to join the session
            </p>
          </div>
        </div>
      </div>

      {/* Session Controls */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            color: "#333",
          }}
        >
          Session Controls
        </h2>

        <div style={{ display: "grid", gap: "1.5rem" }}>
          {/* Active Status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", color: "#333" }}>
                Session Active
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                {sessionData.isActive
                  ? "Session is currently active"
                  : "Session is inactive"}
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={sessionData.isActive}
                onChange={(e) =>
                  updateSessionStatus("isActive", e.target.checked)
                }
                disabled={isExpired}
                style={{
                  width: "20px",
                  height: "20px",
                  cursor: isExpired ? "not-allowed" : "pointer",
                }}
              />
            </label>
          </div>

          {/* Accepting Questions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold", color: "#333" }}>
                Accepting Questions
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                {sessionData.isAcceptingQuestions
                  ? "Participants can submit questions"
                  : "Question submission is paused"}
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={sessionData.isAcceptingQuestions}
                onChange={(e) =>
                  updateSessionStatus("isAcceptingQuestions", e.target.checked)
                }
                disabled={isExpired}
                style={{
                  width: "20px",
                  height: "20px",
                  cursor: isExpired ? "not-allowed" : "pointer",
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            color: "#333",
          }}
        >
          Session Statistics
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#f0fdf4",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color: "#059669",
              }}
            >
              {sessionData._count.questions}
            </div>
            <div style={{ color: "#065f46", fontWeight: "500" }}>
              Total Questions
            </div>
          </div>

          {/* Placeholder for future statistics */}
          <div
            style={{
              padding: "1.5rem",
              backgroundColor: "#eff6ff",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                fontWeight: "bold",
                color: "#2563eb",
              }}
            >
              0
            </div>
            <div style={{ color: "#1e40af", fontWeight: "500" }}>
              Participants
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            color: "#333",
          }}
        >
          Session Management
        </h2>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={endSession}
            disabled={!sessionData.isActive || isExpired}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor:
                !sessionData.isActive || isExpired
                  ? "#9ca3af"
                  : "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor:
                !sessionData.isActive || isExpired
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            End Session
          </button>

          <button
            onClick={() => router.push("/create")}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Create New Session
          </button>
        </div>
      </div>

      {/* Questions Section */}
      <div style={{ marginTop: "3rem" }}>
        {isLoadingQuestions && questions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            Loading questions...
          </div>
        ) : (
          <HostQuestionList
            questions={questions}
            onStatusUpdate={handleQuestionStatusUpdate}
          />
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "1rem",
            borderRadius: "6px",
            marginTop: "1rem",
          }}
        >
          {error}
        </div>
      )}
    </main>
  );
}
