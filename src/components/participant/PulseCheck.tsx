"use client";

import { useState, useEffect } from "react";
import type { PulseCheckFeedbackType } from "@prisma/client";

interface PulseCheckProps {
  questionId: string;
  participantId: string;
  sessionCode: string;
}

const FEEDBACK_OPTIONS: Array<{
  type: PulseCheckFeedbackType;
  emoji: string;
  label: string;
  color: string;
}> = [
  { type: "helpful", emoji: "💚", label: "Helpful", color: "bg-green-100" },
  { type: "neutral", emoji: "💛", label: "Neutral", color: "bg-yellow-100" },
  {
    type: "not_helpful",
    emoji: "🔴",
    label: "Not helpful",
    color: "bg-red-100",
  },
];

export default function PulseCheck({
  questionId,
  participantId,
  sessionCode,
}: PulseCheckProps) {
  const [submittedFeedback, setSubmittedFeedback] =
    useState<PulseCheckFeedbackType | null>(null);
  const [error, setError] = useState("");

  // Load submitted feedback from localStorage
  useEffect(() => {
    const storageKey = `pulse_check_${sessionCode}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<
          string,
          PulseCheckFeedbackType
        >;
        if (parsed[questionId]) {
          setSubmittedFeedback(parsed[questionId]);
        }
      } catch {
        // Invalid data, ignore
      }
    }
  }, [questionId, sessionCode]);

  const handleFeedbackSubmit = async (feedback: PulseCheckFeedbackType) => {
    if (submittedFeedback) return; // Already submitted

    // Optimistic update: Update UI immediately
    setSubmittedFeedback(feedback);
    setError("");

    // Save to localStorage immediately
    const storageKey = `pulse_check_${sessionCode}`;
    const stored = localStorage.getItem(storageKey);
    const pulseChecks: Record<string, PulseCheckFeedbackType> = stored
      ? JSON.parse(stored)
      : {};
    pulseChecks[questionId] = feedback;
    localStorage.setItem(storageKey, JSON.stringify(pulseChecks));

    try {
      // Fire API request in background
      const response = await fetch(`/api/questions/${questionId}/pulse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantId, feedback }),
      });

      // If API fails, revert the optimistic update
      if (!response.ok) {
        const data = await response.json();

        // 409 means already submitted elsewhere - keep the optimistic update
        if (response.status === 409) {
          return;
        }

        // For other errors, revert
        setSubmittedFeedback(null);
        setError(data.message || "Failed to submit feedback");

        // Remove from localStorage
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const pulseChecks: Record<string, PulseCheckFeedbackType> =
            JSON.parse(stored);
          delete pulseChecks[questionId];
          localStorage.setItem(storageKey, JSON.stringify(pulseChecks));
        }
      }
    } catch {
      // Network error - revert optimistic update
      setSubmittedFeedback(null);
      setError("Network error. Please try again.");

      // Remove from localStorage
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const pulseChecks: Record<string, PulseCheckFeedbackType> =
          JSON.parse(stored);
        delete pulseChecks[questionId];
        localStorage.setItem(storageKey, JSON.stringify(pulseChecks));
      }
    }
  };

  if (submittedFeedback) {
    const selectedOption = FEEDBACK_OPTIONS.find(
      (opt) => opt.type === submittedFeedback,
    );
    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="text-green-600">✓</span>
          <span>
            You rated this answer as:{" "}
            <span className="font-medium">
              {selectedOption?.emoji} {selectedOption?.label}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-sm text-gray-700 mb-2">Did this answer help?</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
          <p className="text-red-800 text-xs">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        {FEEDBACK_OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => handleFeedbackSubmit(option.type)}
            className={`flex-1 ${option.color} hover:opacity-80 transition-opacity rounded-lg py-3 px-2 flex flex-col items-center gap-1 min-h-[56px]`}
            aria-label={`Rate as ${option.label}`}
          >
            <span className="text-2xl">{option.emoji}</span>
            <span className="text-xs font-medium text-gray-700">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
