"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { GetSessionResponse } from "@/types/session";
import { getOrCreateParticipantId } from "@/lib/participant-id";
import QuestionSubmitForm from "@/components/participant/QuestionSubmitForm";
import QuestionList from "@/components/participant/QuestionList";

export default function ParticipantSessionPage() {
  const params = useParams();
  const code = params?.code as string;

  // State
  const [sessionData, setSessionData] = useState<
    GetSessionResponse["session"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Name entry state
  const [participantName, setParticipantName] = useState("");
  const [hasEnteredName, setHasEnteredName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Participant ID
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Question refresh key - increment to trigger refresh
  const [questionRefreshKey, setQuestionRefreshKey] = useState(0);

  // Initialize participant ID and check for stored name
  useEffect(() => {
    if (code) {
      const id = getOrCreateParticipantId(code);
      setParticipantId(id);

      // Check if name is stored in localStorage
      const storedName = localStorage.getItem(`participant_name_${code}`);
      if (storedName) {
        setParticipantName(storedName);
        setHasEnteredName(true);
      }
    }
  }, [code]);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      if (!code) return;

      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/sessions/${code}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError("Session not found. Please check the code.");
          } else if (response.status === 410) {
            setError("This session has expired.");
          } else {
            setError(data.error || "Failed to load session");
          }
          return;
        }

        setSessionData(data.session);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [code]);

  // Handle name submission
  const handleNameSubmit = (anonymous: boolean) => {
    if (anonymous) {
      setParticipantName("Anonymous");
      localStorage.removeItem(`participant_name_${code}`);
    } else {
      const trimmedName = nameInput.trim();
      if (trimmedName.length === 0) {
        return; // Don't proceed if name is empty
      }
      if (trimmedName.length > 100) {
        return; // Don't proceed if name is too long
      }
      setParticipantName(trimmedName);
      localStorage.setItem(`participant_name_${code}`, trimmedName);
    }
    setHasEnteredName(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Session
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Session not loaded
  if (!sessionData) {
    return null;
  }

  // Name entry flow
  if (!hasEnteredName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {sessionData.title}
          </h1>
          {sessionData.description && (
            <p className="text-gray-600 mb-6">{sessionData.description}</p>
          )}

          <div className="border-t border-gray-200 my-6"></div>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Join the Session
          </h2>

          <label
            htmlFor="participantName"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Name (Optional)
          </label>
          <input
            id="participantName"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your name"
            maxLength={100}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="space-y-3">
            <button
              onClick={() => handleNameSubmit(false)}
              disabled={nameInput.trim().length === 0}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
            >
              Join with Name
            </button>
            <button
              onClick={() => handleNameSubmit(true)}
              className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-lg font-medium min-h-[56px]"
            >
              Join Anonymously
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main session view
  const isSessionActive = sessionData.isActive;
  const isAcceptingQuestions = sessionData.isAcceptingQuestions;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {sessionData.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">
              Code: <span className="font-mono font-semibold">{code}</span>
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                isSessionActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isSessionActive ? "Active" : "Inactive"}
            </span>
            {isSessionActive && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isAcceptingQuestions
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isAcceptingQuestions
                  ? "Accepting Questions"
                  : "Not Accepting Questions"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Session description */}
        {sessionData.description && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <p className="text-gray-700">{sessionData.description}</p>
          </div>
        )}

        {/* Status messages */}
        {!isSessionActive && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏸️</span>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Session is Inactive
                </h3>
                <p className="text-yellow-800">
                  This session is currently paused. The host can reactivate it
                  at any time.
                </p>
              </div>
            </div>
          </div>
        )}

        {isSessionActive && !isAcceptingQuestions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Questions Paused
                </h3>
                <p className="text-blue-800">
                  The host has temporarily paused new questions. You can still
                  view and vote on existing questions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Participant info */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">
            You are joined as:{" "}
            <span className="text-blue-600">{participantName}</span>
          </h3>
          <p className="text-sm text-gray-600">
            {participantName === "Anonymous"
              ? "You are participating anonymously. Your questions will not show your name."
              : "Your name will appear on questions you submit (unless you choose to submit anonymously)."}
          </p>
        </div>

        {/* Question submission form */}
        <QuestionSubmitForm
          sessionCode={code}
          participantId={participantId || ""}
          participantName={participantName}
          isAcceptingQuestions={isAcceptingQuestions}
          onQuestionSubmitted={() => setQuestionRefreshKey((prev) => prev + 1)}
        />

        {/* Question list with voting */}
        <div className="mt-6">
          <QuestionList
            sessionCode={code}
            participantId={participantId || ""}
            refreshKey={questionRefreshKey}
          />
        </div>
      </div>
    </div>
  );
}
