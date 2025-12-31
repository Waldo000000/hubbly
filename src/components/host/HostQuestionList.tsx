"use client";

import { useState } from "react";
import type { HostQuestionResponse } from "@/types/question";
import { QUESTION_STATUS_LABELS } from "@/types/question";

interface HostQuestionListProps {
  questions: HostQuestionResponse[];
  onQuestionUpdate?: (updatedQuestion: HostQuestionResponse) => void;
}

export default function HostQuestionList({
  questions,
  onQuestionUpdate,
}: HostQuestionListProps) {
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Handle status update
  const handleStatusUpdate = async (
    questionId: string,
    newStatus: "being_answered" | "answered",
  ) => {
    setUpdatingQuestionId(questionId);
    setError(null);

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to update question status");
        setUpdatingQuestionId(null);
        return;
      }

      // Call parent callback if provided
      if (onQuestionUpdate) {
        onQuestionUpdate(data.question);
      }

      setUpdatingQuestionId(null);
    } catch {
      setError("An error occurred while updating the question");
      setUpdatingQuestionId(null);
    }
  };

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No Questions Yet
          </h3>
          <p className="text-gray-600">
            Questions submitted by participants will appear here.
          </p>
        </div>
      </div>
    );
  }

  // Get status badge color scheme
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "dismissed":
        return "bg-red-100 text-red-800";
      case "being_answered":
        return "bg-blue-100 text-blue-800";
      case "answered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format timestamp
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Questions ({questions.length})
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Sorted by vote count (highest first)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {questions.map((question) => {
        const authorDisplay = question.isAnonymous
          ? "Anonymous"
          : question.authorName || "Anonymous";

        return (
          <div
            key={question.id}
            className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-row gap-4 items-start">
              {/* Vote count - left side with prominent display */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="px-4 py-3 rounded-lg bg-blue-50 border-2 border-blue-200 flex flex-col items-center justify-center min-w-[80px]">
                  <span className="text-3xl font-bold text-blue-600">
                    {question.voteCount}
                  </span>
                  <span className="text-xs text-blue-600 font-medium mt-1">
                    {question.voteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              </div>

              {/* Question content - right side */}
              <div className="flex-1 min-w-0">
                {/* Header: Author, status, timestamp */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {authorDisplay}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(question.status)}`}
                  >
                    {QUESTION_STATUS_LABELS[question.status]}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatTimestamp(question.createdAt)}
                  </span>
                </div>

                {/* Question text */}
                <p className="text-gray-900 text-base leading-relaxed break-words">
                  {question.content}
                </p>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600 font-medium mr-2">
                    Mark as:
                  </span>
                  <button
                    onClick={() =>
                      handleStatusUpdate(question.id, "being_answered")
                    }
                    disabled={
                      updatingQuestionId === question.id ||
                      question.status === "being_answered"
                    }
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      question.status === "being_answered"
                        ? "bg-blue-100 text-blue-800 cursor-not-allowed"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    } ${updatingQuestionId === question.id ? "opacity-50 cursor-wait" : ""}`}
                  >
                    {updatingQuestionId === question.id
                      ? "Updating..."
                      : "Being Answered"}
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(question.id, "answered")}
                    disabled={
                      updatingQuestionId === question.id ||
                      question.status === "answered"
                    }
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      question.status === "answered"
                        ? "bg-green-100 text-green-800 cursor-not-allowed"
                        : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    } ${updatingQuestionId === question.id ? "opacity-50 cursor-wait" : ""}`}
                  >
                    {updatingQuestionId === question.id
                      ? "Updating..."
                      : "Answered"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
