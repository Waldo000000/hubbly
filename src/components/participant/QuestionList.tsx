"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import type { GetQuestionsResponse } from "@/types/question";
import { sortQuestions } from "@/lib/question-utils";
import { fetcher } from "@/lib/swr-utils";
import QuestionCard from "./QuestionCard";

interface QuestionListProps {
  sessionCode: string;
  participantId: string;
  scrollToQuestionId?: string | null;
  onScrollComplete?: () => void;
}

export default function QuestionList({
  sessionCode,
  participantId,
  scrollToQuestionId,
  onScrollComplete,
}: QuestionListProps) {
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

  // Track previous question IDs to detect new questions
  const prevQuestionIds = useRef<Set<string>>(new Set());

  // Track newly added question IDs for highlighting
  const [newQuestionIds, setNewQuestionIds] = useState<Set<string>>(new Set());

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

  // Auto-scroll to "being_answered" question when it changes (host feature)
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

  // Auto-scroll to newly submitted question
  useEffect(() => {
    if (!scrollToQuestionId) return;

    // Check if the question exists in the list
    const questionExists = questions.some((q) => q.id === scrollToQuestionId);
    if (!questionExists) return;

    // Wait a bit for DOM to update and animations to settle
    const timeoutId = setTimeout(() => {
      const element = questionRefs.current.get(scrollToQuestionId);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      onScrollComplete?.();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [scrollToQuestionId, questions, onScrollComplete]);

  // Detect new questions and highlight them
  useEffect(() => {
    const currentIds = new Set(questions.map((q) => q.id));
    const newIds = new Set<string>();

    // Find questions that weren't in the previous list
    questions.forEach((q) => {
      if (!prevQuestionIds.current.has(q.id)) {
        newIds.add(q.id);
      }
    });

    // Update highlights for new questions
    if (newIds.size > 0) {
      setNewQuestionIds(newIds);

      // Remove highlights after 2 seconds
      setTimeout(() => {
        setNewQuestionIds(new Set());
      }, 2000);
    }

    // Update previous question IDs for next comparison
    prevQuestionIds.current = currentIds;
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
        <AnimatePresence initial={false}>
          {sortedQuestions.map((question) => {
            const isNew = newQuestionIds.has(question.id);
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
                style={{ position: "relative" }}
                ref={(el) => {
                  if (el) {
                    questionRefs.current.set(question.id, el);
                  } else {
                    questionRefs.current.delete(question.id);
                  }
                }}
                className={isNew ? "new-question-highlight" : ""}
              >
                <QuestionCard
                  question={question}
                  participantId={participantId}
                  sessionCode={sessionCode}
                  isVotedByMe={votedQuestions.has(question.id)}
                  onVoteChange={handleVoteChange}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
