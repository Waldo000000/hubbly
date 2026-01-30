"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { HostQuestionResponse } from "@/types/question";
import { QUESTION_STATUS_LABELS, PULSE_CHECK_EMOJIS } from "@/types/question";
import { sortQuestions } from "@/lib/question-utils";

interface HostQuestionListProps {
  questions: HostQuestionResponse[];
  onStatusUpdate: (questionId: string, newStatus: "being_answered" | "answered") => Promise<void>;
}

export default function HostQuestionList({
  questions,
  onStatusUpdate,
}: HostQuestionListProps) {
  const [error, setError] = useState<string | null>(null);

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

  // Sort questions: being_answered at top, then by votes, then by creation time
  const sortedQuestions = sortQuestions(questions);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Questions ({questions.length})
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Currently being answered shown first, then sorted by votes
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <AnimatePresence initial={false}>
        {sortedQuestions.map((question) => {
          const isBeingAnswered = question.status === "being_answered";
          const authorDisplay = question.isAnonymous
            ? "Anonymous"
            : question.authorName || "Anonymous";

          return (
            <motion.div
              key={question.id}
              layout
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                layout: {
                  duration: 0.35,
                  ease: "easeOut"
                },
                opacity: { duration: 0.2 }
              }}
              layoutScroll={false}
              className={`rounded-lg shadow-md border-2 p-5 hover:shadow-lg transition-colors ${
                isBeingAnswered
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white border-gray-200"
              }`}
              style={isBeingAnswered ? {
                boxShadow: "0 0 0 2px rgb(191 219 254)" // Simulates ring-2 ring-blue-200 without affecting layout
              } : undefined}
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
                  {isBeingAnswered ? (
                    <span className="px-3 py-1.5 rounded-md text-sm font-semibold bg-blue-600 text-white shadow-sm">
                      🎯 Currently Being Answered
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(question.status)}`}
                    >
                      {QUESTION_STATUS_LABELS[question.status]}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {formatTimestamp(question.createdAt)}
                  </span>
                </div>

                {/* Question text */}
                <p className="text-gray-900 text-base leading-relaxed break-words">
                  {question.content}
                </p>

                {/* Pulse check stats - always reserve space to prevent height changes */}
                <div className="mt-3 h-[52px]">
                  {question.status === "answered" && question.pulseCheckStats ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg p-3 h-full"
                    >
                      <span className="text-gray-600 font-medium">Feedback:</span>
                      <span className="flex items-center gap-1">
                        {PULSE_CHECK_EMOJIS.helpful}{" "}
                        <span className="font-medium">
                          {question.pulseCheckStats.helpful}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        {PULSE_CHECK_EMOJIS.neutral}{" "}
                        <span className="font-medium">
                          {question.pulseCheckStats.neutral}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        {PULSE_CHECK_EMOJIS.not_helpful}{" "}
                        <span className="font-medium">
                          {question.pulseCheckStats.not_helpful}
                        </span>
                      </span>
                      {question.pulseCheckStats.helpful +
                        question.pulseCheckStats.neutral +
                        question.pulseCheckStats.not_helpful ===
                        0 && (
                        <span className="text-gray-500 italic ml-2">
                          No feedback yet
                        </span>
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-full" />
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600 font-medium mr-2">
                    Mark as:
                  </span>
                  <button
                    onClick={() => {
                      setError(null);
                      onStatusUpdate(question.id, "being_answered");
                    }}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      question.status === "being_answered"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    }`}
                  >
                    Being Answered
                  </button>
                  <button
                    onClick={() => {
                      setError(null);
                      onStatusUpdate(question.id, "answered");
                    }}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      question.status === "answered"
                        ? "bg-green-100 text-green-800"
                        : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                    }`}
                  >
                    Answered
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
