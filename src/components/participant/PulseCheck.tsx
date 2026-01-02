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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (submittedFeedback || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(`/api/questions/${questionId}/pulse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantId, feedback }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Already submitted (from another device or session)
          setSubmittedFeedback(feedback);
        } else {
          setError(data.message || "Failed to submit feedback");
        }
        return;
      }

      // Success
      setSubmittedFeedback(feedback);

      // Save to localStorage
      const storageKey = `pulse_check_${sessionCode}`;
      const stored = localStorage.getItem(storageKey);
      const pulseChecks: Record<string, PulseCheckFeedbackType> = stored
        ? JSON.parse(stored)
        : {};
      pulseChecks[questionId] = feedback;
      localStorage.setItem(storageKey, JSON.stringify(pulseChecks));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
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
            disabled={isSubmitting}
            className={`flex-1 ${option.color} hover:opacity-80 transition-opacity rounded-lg py-3 px-2 flex flex-col items-center gap-1 min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed`}
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
