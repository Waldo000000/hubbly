"use client";

import { useState } from "react";
import type { QuestionResponse } from "@/types/question";

interface QuestionCardProps {
  question: QuestionResponse;
  participantId: string;
  isVotedByMe: boolean;
  onVoteChange: (questionId: string, voted: boolean) => void;
}

export default function QuestionCard({
  question,
  participantId,
  isVotedByMe,
  onVoteChange,
}: QuestionCardProps) {
  const [isVoting, setIsVoting] = useState(false);

  const handleVoteToggle = async () => {
    try {
      setIsVoting(true);

      if (isVotedByMe) {
        // Remove vote
        const response = await fetch(`/api/questions/${question.id}/vote`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ participantId }),
        });

        if (response.ok) {
          onVoteChange(question.id, false);
        }
      } else {
        // Add vote
        const response = await fetch(`/api/questions/${question.id}/vote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ participantId }),
        });

        if (response.ok) {
          onVoteChange(question.id, true);
        }
      }
    } catch (error) {
      console.error("Error toggling vote:", error);
    } finally {
      setIsVoting(false);
    }
  };

  // Status badge display
  const getStatusBadge = () => {
    switch (question.status) {
      case "being_answered":
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
            Being Answered
          </span>
        );
      case "answered_live":
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            Answered Live
          </span>
        );
      case "answered_via_docs":
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
            Answered via Docs
          </span>
        );
      case "answered":
        return (
          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            Answered
          </span>
        );
      default:
        return null;
    }
  };

  const authorDisplay = question.isAnonymous
    ? "Anonymous"
    : question.authorName || "Anonymous";

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex gap-4">
      {/* Vote button */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <button
          onClick={handleVoteToggle}
          disabled={isVoting}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
            isVotedByMe
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={isVotedByMe ? "Remove vote" : "Vote for this question"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M12 4l-8 8h5v8h6v-8h5z" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {question.voteCount}
        </span>
      </div>

      {/* Question content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <p className="text-gray-900 text-base leading-relaxed break-words">
              {question.content}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">by {authorDisplay}</span>
          {getStatusBadge()}
        </div>
      </div>
    </div>
  );
}
