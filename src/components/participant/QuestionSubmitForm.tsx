"use client";

import { useState } from "react";
import type { SubmitQuestionRequest } from "@/types/question";

interface QuestionSubmitFormProps {
  sessionCode: string;
  participantId: string;
  participantName: string;
  isAcceptingQuestions: boolean;
}

export default function QuestionSubmitForm({
  sessionCode,
  participantId,
  participantName,
  isAcceptingQuestions,
}: QuestionSubmitFormProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
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

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      const requestBody: SubmitQuestionRequest = {
        content: content.trim(),
        participantId,
        authorName: isAnonymous ? undefined : participantName,
        isAnonymous,
      };

      const response = await fetch(`/api/sessions/${sessionCode}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
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

      // Success
      setSuccessMessage("Question submitted successfully!");
      setContent("");
      setIsAnonymous(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch {
      setErrorMessage(
        "Network error. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
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
            disabled={!isAcceptingQuestions || isSubmitting}
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
            disabled={!isAcceptingQuestions || isSubmitting}
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

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!isAcceptingQuestions || !isContentValid || isSubmitting}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            "Submit Question"
          )}
        </button>
      </form>
    </div>
  );
}
