"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import type { GetQuestionsResponse } from "@/types/question";
import { sortQuestions } from "@/lib/question-utils";
import QuestionCard from "./QuestionCard";

interface QuestionListProps {
  sessionCode: string;
  participantId: string;
}

export default function QuestionList({
  sessionCode,
  participantId,
}: QuestionListProps) {
  // Fetcher function for SWR
  const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to load questions");
    }
    return response.json();
  };

  // SWR hook - handles fetching, caching, revalidation
  const {
    data,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<GetQuestionsResponse>(`/api/sessions/${sessionCode}/questions`, fetcher, {
    refreshInterval: 10000, // Poll every 10 seconds
    revalidateOnFocus: true, // Refetch when user returns to tab
    dedupingInterval: 2000, // Deduplicate requests within 2s
  });

  const questions = data?.questions || [];
  const error = swrError?.message || "";

  const [votedQuestions, setVotedQuestions] = useState<Set<string>>(new Set());

  // Track refs for each question card for auto-scroll
  const questionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Track the ID of the question currently being answered
  const prevBeingAnsweredId = useRef<string | null>(null);

  // Load voted questions from localStorage
  useEffect(() => {
    const storageKey = `voted_questions_${sessionCode}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setVotedQuestions(new Set(parsed));
      } catch {
        // Invalid data, ignore
      }
    }
  }, [sessionCode]);

  // Auto-scroll to "being_answered" question when it changes
  useEffect(() => {
    const beingAnsweredQuestion = questions.find(
      (q) => q.status === "being_answered",
    );
    const currentBeingAnsweredId = beingAnsweredQuestion?.id || null;

    // If there's a new being_answered question (and it's different from previous)
    if (
      currentBeingAnsweredId &&
      currentBeingAnsweredId !== prevBeingAnsweredId.current
    ) {
      const element = questionRefs.current.get(currentBeingAnsweredId);
      if (element) {
        // Scroll to element with smooth animation
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }

    // Update the previous being_answered ID
    prevBeingAnsweredId.current = currentBeingAnsweredId;
  }, [questions]);

  // Handle vote change with optimistic updates
  const handleVoteChange = (questionId: string, voted: boolean) => {
    const newVotedQuestions = new Set(votedQuestions);

    if (voted) {
      newVotedQuestions.add(questionId);
    } else {
      newVotedQuestions.delete(questionId);
    }

    setVotedQuestions(newVotedQuestions);

    // Save to localStorage
    const storageKey = `voted_questions_${sessionCode}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(newVotedQuestions)),
    );

    // Optimistic update with SWR
    // Update UI immediately, then revalidate from server
    mutate(
      (currentData) => {
        if (!currentData) return currentData;

        return {
          ...currentData,
          questions: currentData.questions.map((q) =>
            q.id === questionId
              ? { ...q, voteCount: q.voteCount + (voted ? 1 : -1) }
              : q
          ),
        };
      },
      { revalidate: false } // Don't refetch immediately, wait for next interval
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Loading questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions</h2>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">💬</span>
          <p className="text-gray-600">
            No questions yet. Be the first to ask!
          </p>
        </div>
      </div>
    );
  }

  // Sort questions: being_answered at top, then by votes, then by creation time
  const sortedQuestions = sortQuestions(questions);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
        <span className="text-sm text-gray-600">
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {sortedQuestions.map((question) => (
          <div
            key={question.id}
            ref={(el) => {
              if (el) {
                questionRefs.current.set(question.id, el);
              } else {
                questionRefs.current.delete(question.id);
              }
            }}
          >
            <QuestionCard
              question={question}
              participantId={participantId}
              sessionCode={sessionCode}
              isVotedByMe={votedQuestions.has(question.id)}
              onVoteChange={handleVoteChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
