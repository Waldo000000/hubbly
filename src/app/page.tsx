"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HealthStatus {
  status: string;
  nextjs: string;
  database: {
    success: boolean;
    message: string;
    demoUser?: {
      id: string;
      email: string;
      name: string;
    };
  };
  timestamp: string;
}

export default function HomePage() {
  const router = useRouter();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCode, setSessionCode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setHealthStatus(data);
      } catch (error) {
        console.error("Failed to fetch health status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  const handleJoinSession = () => {
    const trimmedCode = sessionCode.trim().toUpperCase();

    // Validate session code format (6 alphanumeric characters)
    if (!trimmedCode) {
      setJoinError("Please enter a session code");
      return;
    }

    if (trimmedCode.length !== 6) {
      setJoinError("Session code must be 6 characters");
      return;
    }

    if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      setJoinError("Session code must contain only letters and numbers");
      return;
    }

    // Clear error and navigate to session
    setJoinError("");
    router.push(`/session/${trimmedCode}`);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setSessionCode(value);
    setJoinError(""); // Clear error when user types
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJoinSession();
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem", color: "#333" }}>
          Welcome to Hubbly
        </h1>
        <p style={{ fontSize: "1.25rem", marginBottom: "2rem", color: "#666" }}>
          Real-time Q&A platform for events, meetings, and presentations
        </p>

        <div style={{ marginBottom: "3rem" }}>
          <Link href="/create" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "0.75rem 2rem",
                fontSize: "1.1rem",
                backgroundColor: "#0070f3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                marginBottom: "2rem",
              }}
            >
              Create Session
            </button>
          </Link>

          <div
            style={{
              maxWidth: "500px",
              margin: "0 auto",
              padding: "1.5rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "12px",
              border: "1px solid #e9ecef",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                marginBottom: "1rem",
                color: "#333",
              }}
            >
              Join a Session
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#666",
                marginBottom: "1rem",
              }}
            >
              Enter the 6-character session code
            </p>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
              }}
            >
              <input
                type="text"
                value={sessionCode}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                placeholder="ABC123"
                maxLength={6}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  fontSize: "1.1rem",
                  border: joinError ? "2px solid #dc3545" : "2px solid #dee2e6",
                  borderRadius: "8px",
                  textAlign: "center",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  outline: "none",
                }}
              />
              <button
                onClick={handleJoinSession}
                disabled={sessionCode.length !== 6}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1.1rem",
                  backgroundColor:
                    sessionCode.length === 6 ? "#0070f3" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: sessionCode.length === 6 ? "pointer" : "not-allowed",
                  fontWeight: "bold",
                  transition: "background-color 0.2s",
                }}
              >
                Join
              </button>
            </div>

            {joinError && (
              <p
                style={{
                  color: "#dc3545",
                  fontSize: "0.9rem",
                  marginTop: "0.5rem",
                  textAlign: "left",
                }}
              >
                {joinError}
              </p>
            )}
          </div>
        </div>

        {/* Database Status Section */}
        <div
          style={{
            marginBottom: "3rem",
            padding: "1.5rem",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e9ecef",
          }}
        >
          <h3
            style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#333" }}
          >
            System Status
          </h3>
          {loading ? (
            <p style={{ color: "#666" }}>Checking system status...</p>
          ) : healthStatus ? (
            <div style={{ textAlign: "left" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Application:</strong>{" "}
                <span
                  style={{
                    color: healthStatus.status === "ok" ? "#28a745" : "#dc3545",
                    fontWeight: "bold",
                  }}
                >
                  {healthStatus.status === "ok" ? "✓ Online" : "✗ Error"}
                </span>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Next.js:</strong>{" "}
                <span
                  style={{
                    color: healthStatus.nextjs === "ok" ? "#28a745" : "#dc3545",
                    fontWeight: "bold",
                  }}
                >
                  {healthStatus.nextjs === "ok" ? "✓ OK" : "✗ Error"}
                </span>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Database:</strong>{" "}
                <span
                  style={{
                    color: healthStatus.database.success
                      ? "#28a745"
                      : "#dc3545",
                    fontWeight: "bold",
                  }}
                >
                  {healthStatus.database.success ? "✓ Connected" : "✗ Error"}
                </span>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#666",
                    marginTop: "0.25rem",
                  }}
                >
                  {healthStatus.database.message}
                </div>
              </div>
              {healthStatus.database.demoUser && (
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  Demo user: {healthStatus.database.demoUser.name} (
                  {healthStatus.database.demoUser.email})
                </div>
              )}
              <div
                style={{ fontSize: "0.8rem", color: "#999", marginTop: "1rem" }}
              >
                Last checked:{" "}
                {new Date(healthStatus.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <p style={{ color: "#dc3545" }}>Failed to load system status</p>
          )}
        </div>

        <div style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto" }}>
          <h2
            style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#333" }}
          >
            How it works:
          </h2>
          <ol style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "#555" }}>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Hosts:</strong> Create a session and get a 6-digit code to
              share
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Audience:</strong> Join with the code and submit questions
              anonymously
            </li>
            <li style={{ marginBottom: "0.5rem" }}>
              <strong>Engage:</strong> Vote on questions and see answers in
              real-time
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
