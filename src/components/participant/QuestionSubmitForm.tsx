"use client";

import { useState } from "react";
import { mutate } from "swr";
import { createId } from "@paralleldrive/cuid2";
import type { SubmitQuestionRequest } from "@/types/question";

interface QuestionSubmitFormProps {
  sessionCode: string;
  participantId: string;
  participantName: string;
  isAcceptingQuestions: boolean;
  onQuestionSubmitted?: (questionId: string) => void;
}

export default function QuestionSubmitForm({
  sessionCode,
  participantId,
  participantName,
  isAcceptingQuestions,
  onQuestionSubmitted,
}: QuestionSubmitFormProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const maxCharacters = 100000;
  const isContentValid = content.length > 0 && content.length <= maxCharacters;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!isContentValid) {
      if (content.length === 0) {
        setErrorMessage("Question content is required.");
      } else {
        setErrorMessage(`Question is too long (maximum ${maxCharacters.toLocaleString()} characters).`);
      }
      return;
    }

    // Store original form values for potential restoration
    const originalContent = content;
    const originalIsAnonymous = isAnonymous;

    // Generate client ID for optimistic update (will be used by server)
    const questionId = createId();
    const now = new Date().toISOString();

    // Create optimistic question object
    const optimisticQuestion = {
      id: questionId,
      sessionId: sessionCode,
      participantId,
      authorName: originalIsAnonymous ? undefined : participantName,
      content: originalContent.trim(),
      voteCount: 0,
      status: "approved" as const,
      isAnonymous: originalIsAnonymous,
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update: Clear form AND add question to list immediately
    setContent("");
    setIsAnonymous(false);
    setErrorMessage("");

    // Add optimistic question to the list
    mutate(
      `/api/sessions/${sessionCode}/questions`,
      (currentData: { questions: typeof optimisticQuestion[] } | undefined) => {
        if (!currentData) {
          return { questions: [optimisticQuestion], total: 1 };
        }
        return {
          questions: [optimisticQuestion, ...currentData.questions],
          total: currentData.questions.length + 1,
        };
      },
      { revalidate: false }
    );

    // Notify parent to scroll to the optimistic question
    if (onQuestionSubmitted) {
      onQuestionSubmitted(questionId);
    }

    try {
      const requestBody: SubmitQuestionRequest = {
        id: questionId, // Send client-generated ID to server
        content: originalContent.trim(),
        participantId,
        authorName: originalIsAnonymous ? undefined : participantName,
        isAnonymous: originalIsAnonymous,
      };

      // Fire API request
      const response = await fetch(`/api/sessions/${sessionCode}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      // If API fails, revert the optimistic update
      if (!response.ok) {
        // Remove the optimistic question from the list
        mutate(
          `/api/sessions/${sessionCode}/questions`,
          (currentData: { questions: typeof optimisticQuestion[] } | undefined) => {
            if (!currentData) return currentData;
            return {
              questions: currentData.questions.filter((q) => q.id !== questionId),
              total: currentData.questions.length - 1,
            };
          },
          { revalidate: false }
        );

        // Restore form content
        setContent(originalContent);
        setIsAnonymous(originalIsAnonymous);

        // Show appropriate error message
        if (response.status === 429) {
          setErrorMessage(
            data.message || "Too many questions. Please try again later.",
          );
        } else if (response.status === 400) {
          setErrorMessage(
            data.message || "Invalid question. Please check your input.",
          );
        } else {
          setErrorMessage(
            data.message || "Failed to submit question. Please try again.",
          );
        }
        return;
      }

      // Success - revalidate from server
      // Server will return the question with the same ID we sent,
      // so framer-motion sees it as the same element (no animation glitch)
      mutate(`/api/sessions/${sessionCode}/questions`);
    } catch {
      // Network error - revert optimistic update
      mutate(
        `/api/sessions/${sessionCode}/questions`,
        (currentData: { questions: typeof optimisticQuestion[] } | undefined) => {
          if (!currentData) return currentData;
          return {
            questions: currentData.questions.filter((q) => q.id !== questionId),
            total: currentData.questions.length - 1,
          };
        },
        { revalidate: false }
      );

      setContent(originalContent);
      setIsAnonymous(originalIsAnonymous);
      setErrorMessage(
        "Network error. Please check your connection and try again.",
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Submit a Question
      </h2>

      {!isAcceptingQuestions && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">
            The host has temporarily paused new questions. Please check back
            later.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Textarea */}
        <div>
          <label
            htmlFor="questionContent"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Your Question
          </label>
          <textarea
            id="questionContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What would you like to ask?"
            rows={4}
            disabled={!isAcceptingQuestions}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          />
        </div>

        {/* Anonymous checkbox */}
        <div className="flex items-center">
          <input
            id="anonymousCheckbox"
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            disabled={!isAcceptingQuestions}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="anonymousCheckbox"
            className="ml-3 text-sm text-gray-700"
          >
            Submit anonymously{" "}
            {participantName !== "Anonymous" && "(hide my name)"}
          </label>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isAcceptingQuestions || !isContentValid}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex items-center justify-center"
        >
          Submit Question
        </button>
      </form>
    </div>
  );
}
