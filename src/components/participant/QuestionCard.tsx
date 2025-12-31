"use client";

import { useState } from "react";
import type { QuestionResponse } from "@/types/question";
import { PULSE_CHECK_EMOJIS } from "@/types/question";
import PulseCheck from "./PulseCheck";

interface QuestionCardProps {
  question: QuestionResponse;
  participantId: string;
  sessionCode: string;
  isVotedByMe: boolean;
  onVoteChange: (questionId: string, voted: boolean) => void;
}

export default function QuestionCard({
  question,
  participantId,
  sessionCode,
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

  // Check if question has answered status for pulse check
  const isAnswered = ["answered"].includes(question.status);

  return (
    <div className="w-full bg-white rounded-lg shadow-md border-2 border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex flex-row gap-4 items-start">
        {/* Vote button - left side */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={handleVoteToggle}
            disabled={isVoting}
            className={`px-3 py-2 rounded-lg flex flex-col items-center justify-center transition-all border-2 min-w-[64px] ${
              isVotedByMe
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={isVotedByMe ? "Remove vote" : "Vote for this question"}
          >
            <span className="text-2xl leading-none">▲</span>
            <span className="text-sm font-bold mt-1">{question.voteCount}</span>
            <span className="text-xs mt-1">
              {isVotedByMe ? "Voted" : "Vote"}
            </span>
          </button>
        </div>

        {/* Question content - right side */}
        <div className="flex-1 min-w-0">
          {/* Author and status at top */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-medium text-gray-600">
              {authorDisplay}
            </span>
            {getStatusBadge()}
          </div>

          {/* Question text */}
          <p className="text-gray-900 text-base leading-relaxed break-words">
            {question.content}
          </p>

          {/* Pulse check for answered questions */}
          {isAnswered && (
            <div className="mt-3">
              <PulseCheck
                questionId={question.id}
                participantId={participantId}
                sessionCode={sessionCode}
              />
              {/* Display pulse check stats */}
              {question.pulseCheckStats && (
                <div className="mt-2 flex items-center gap-3 text-sm">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
