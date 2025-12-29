"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateSessionResponse } from "@/types/session";

export default function CreateSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdSession, setCreatedSession] = useState<
    CreateSessionResponse["session"] | null
  >(null);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
  }>({});

  // Client-side validation matching server rules
  const validateForm = () => {
    const errors: { title?: string; description?: string } = {};

    if (!title.trim()) {
      errors.title = "Title is required";
    } else if (title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters long";
    } else if (title.trim().length > 100) {
      errors.title = "Title must be no more than 100 characters long";
    }

    if (description && description.length > 500) {
      errors.description =
        "Description must be no more than 500 characters long";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          setValidationErrors(result.details);
        } else {
          setError(result.error || "Failed to create session");
        }
        return;
      }

      setCreatedSession(result.session);
      // Reset form
      setTitle("");
      setDescription("");
      setValidationErrors({});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google");
    }
  }, [status]);

  if (status === "loading") {
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
          <div style={{ color: "#666" }}>Checking authentication status</div>
        </div>
      </div>
    );
  }

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
            Please sign in with Google to create a Q&A session
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
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: "0 auto",
            }}
          >
            <span>🔐</span>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // Show success state if session was created
  if (createdSession) {
    return (
      <main
        style={{
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
          <h1
            style={{
              fontSize: "2.5rem",
              marginBottom: "1rem",
              color: "#059669",
            }}
          >
            Session Created Successfully!
          </h1>
        </div>

        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ marginBottom: "1rem", color: "#065f46" }}>
            Session Details
          </h2>
          <div style={{ marginBottom: "1rem" }}>
            <strong>Title:</strong> {createdSession.title}
          </div>
          {createdSession.description && (
            <div style={{ marginBottom: "1rem" }}>
              <strong>Description:</strong> {createdSession.description}
            </div>
          )}
          <div style={{ marginBottom: "1rem" }}>
            <strong>Session Code:</strong>
            <span
              style={{
                backgroundColor: "#dcfce7",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#065f46",
                marginLeft: "1rem",
              }}
            >
              {createdSession.code}
            </span>
          </div>
          <div style={{ fontSize: "0.9rem", color: "#374151" }}>
            <strong>Expires:</strong>{" "}
            {new Date(createdSession.expiresAt).toLocaleString()}
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            gap: "1rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            onClick={() => router.push(`/session/${createdSession.code}/host`)}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Go to Host Dashboard
          </button>

          <button
            onClick={() => setCreatedSession(null)}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Create Another Session
          </button>

          <div style={{ fontSize: "0.9rem", color: "#666" }}>
            Share the session code <strong>{createdSession.code}</strong> with
            participants
          </div>
        </div>
      </main>
    );
  }

  // User is authenticated, show the create session page
  return (
    <>
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <main
        style={{
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1
            style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "#333" }}
          >
            Create New Session
          </h1>
          <p style={{ fontSize: "1.1rem", color: "#666" }}>
            Set up a Q&A session for your event or meeting
          </p>
        </div>

        {/* User info */}
        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            {session?.user?.image && (
              <img
                src={session?.user?.image}
                alt="Profile"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                }}
              />
            )}
            <div>
              <div style={{ fontWeight: "bold", color: "#333" }}>
                {session?.user?.name}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>
                {session?.user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              backgroundColor: "transparent",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Create session form */}
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Session Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Weekly Team Meeting Q&A"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  border: `1px solid ${validationErrors.title ? "#ef4444" : "#d1d5db"}`,
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
                required
              />
              {validationErrors.title && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {validationErrors.title}
                </div>
              )}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context for your audience about this Q&A session..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "1rem",
                  border: `1px solid ${validationErrors.description ? "#ef4444" : "#d1d5db"}`,
                  borderRadius: "6px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              {validationErrors.description && (
                <div
                  style={{
                    color: "#ef4444",
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                  }}
                >
                  {validationErrors.description}
                </div>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                fontWeight: "bold",
                backgroundColor: isSubmitting ? "#9ca3af" : "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                marginTop: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite" }}>
                    ⏳
                  </span>
                  Creating Session...
                </>
              ) : (
                <>🚀 Create Session</>
              )}
            </button>
          </form>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            fontSize: "0.9rem",
            color: "#666",
          }}
        >
          ✨ NextAuth.js authentication is working!
        </div>
      </main>
    </>
  );
}
