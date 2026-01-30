"use client";

import { useEffect, useState, useRef } from "react";
import useSWR from "swr";
import FlipMove from "react-flip-move";
import type { GetQuestionsResponse } from "@/types/question";
import { sortQuestions } from "@/lib/question-utils";
import { fetcher } from "@/lib/swr-utils";
import QuestionCard from "./QuestionCard";

interface QuestionListProps {
  sessionCode: string;
  participantId: string;
}

export default function QuestionList({
  sessionCode,
  participantId,
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

  // Track newly added question IDs with timestamps for highlighting
  const [newQuestionIds, setNewQuestionIds] = useState<Map<string, number>>(
    new Map()
  );

  // Track if we should scroll to a specific question (only for new submissions)
  const scrollToQuestionId = useRef<string | null>(null);

  // Track scroll position to prevent unwanted scrolling during animations
  const preventScrollAdjustment = useRef(false);

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

  // Auto-scroll only to newly submitted questions (not on voting/re-sorting)
  useEffect(() => {
    if (scrollToQuestionId.current && !preventScrollAdjustment.current) {
      // Wait for FlipMove animation to complete before scrolling
      const timeoutId = setTimeout(() => {
        if (!preventScrollAdjustment.current) {
          const element = questionRefs.current.get(scrollToQuestionId.current!);
          if (element) {
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
          scrollToQuestionId.current = null;
        }
      }, 400); // Wait for FlipMove animation (350ms) + small buffer

      return () => clearTimeout(timeoutId);
    }
  }, [questions]);

  // Detect new questions and handle highlighting + scrolling
  useEffect(() => {
    const currentIds = new Set(questions.map((q) => q.id));
    const newIds = new Map<string, number>();

    // Find questions that weren't in the previous list
    questions.forEach((q) => {
      if (!prevQuestionIds.current.has(q.id)) {
        newIds.set(q.id, Date.now());
      }
    });

    // Check if user just submitted a question (within last 3 seconds)
    const storageKey = `new_question_${sessionCode}`;
    const stored = localStorage.getItem(storageKey);
    let userSubmittedId: string | null = null;

    if (stored) {
      try {
        const { questionId, timestamp } = JSON.parse(stored);
        const age = Date.now() - timestamp;

        // If submission was recent and question exists in list
        if (age < 3000 && currentIds.has(questionId)) {
          userSubmittedId = questionId;
          // Clear the marker
          localStorage.removeItem(storageKey);
        } else if (age >= 3000) {
          // Clean up old marker
          localStorage.removeItem(storageKey);
        }
      } catch {
        // Invalid data, remove it
        localStorage.removeItem(storageKey);
      }
    }

    // Update new question highlights
    if (newIds.size > 0) {
      setNewQuestionIds(newIds);

      // Set scroll target only for user's submitted question
      if (userSubmittedId && currentIds.has(userSubmittedId)) {
        scrollToQuestionId.current = userSubmittedId;
      }

      // Remove highlights after 2 seconds
      setTimeout(() => {
        setNewQuestionIds(new Map());
      }, 2000);
    }

    // Update previous question IDs for next comparison
    prevQuestionIds.current = currentIds;
  }, [questions, sessionCode]);

  // Handle vote change with optimistic updates
  const handleVoteChange = (questionId: string, voted: boolean) => {
    // Save current scroll position before any updates
    const currentScrollY = window.scrollY;

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

    // Prevent scroll adjustment during animation
    preventScrollAdjustment.current = true;

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

    // Restore scroll position after React updates and FlipMove animates
    requestAnimationFrame(() => {
      window.scrollTo(0, currentScrollY);

      // Keep scroll locked during animation
      setTimeout(() => {
        preventScrollAdjustment.current = false;
      }, 400); // Match FlipMove duration + buffer
    });
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

      <FlipMove
        duration={350}
        easing="ease-out"
        staggerDelayBy={0}
        appearAnimation={false}
        enterAnimation={false}
        leaveAnimation={false}
        maintainContainerHeight={true}
        typeName="div"
        className="flex flex-col gap-4"
      >
        {sortedQuestions.map((question) => {
          const isNew = newQuestionIds.has(question.id);
          return (
            <div
              key={question.id}
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
            </div>
          );
        })}
      </FlipMove>
    </div>
  );
}
