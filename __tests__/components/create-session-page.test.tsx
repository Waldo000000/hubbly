/**
 * Create Session Page Business Logic Tests
 * Tests the authentication flow and conditional rendering behavior
 * Target: src/app/create/page.tsx
 */

import { render, screen } from "@testing-library/react";
import { useSession, signIn } from "next-auth/react";
import CreateSessionPage from "../../src/app/create/page";

// Mock NextAuth
jest.mock("next-auth/react");
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useParams: jest.fn(() => ({})),
}));

describe("Create Session Page Authentication Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show loading state while checking authentication", () => {
    // Business rule: Show loading UI while auth status is being determined
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<CreateSessionPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(
      screen.getByText("Checking authentication status"),
    ).toBeInTheDocument();
  });

  it("should show sign-in prompt for unauthenticated users", () => {
    // Business rule: Show sign-in UI when user is not authenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<CreateSessionPage />);

    expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    expect(
      screen.getByText("Please sign in with Google to create a Q&A session"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
  });

  it("should auto-redirect unauthenticated users to Google sign-in", () => {
    // Business rule: Automatically trigger Google OAuth when unauthenticated
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<CreateSessionPage />);

    expect(mockSignIn).toHaveBeenCalledWith("google");
  });

  it("should show create session form for authenticated users", () => {
    // Business rule: Show session creation form when user is authenticated
    const mockSession = {
      user: {
        name: "John Doe",
        email: "john@example.com",
        image: "https://example.com/avatar.jpg",
      },
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });

    render(<CreateSessionPage />);

    expect(screen.getByText("Create New Session")).toBeInTheDocument();
    expect(
      screen.getByText("Set up a Q&A session for your event or meeting"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., Weekly Team Meeting Q&A"),
    ).toBeInTheDocument();
    expect(screen.getByText("🚀 Create Session")).toBeInTheDocument();
  });

  it("should display user information when authenticated", () => {
    // Business rule: Show authenticated user's profile information
    const mockSession = {
      user: {
        name: "Jane Smith",
        email: "jane@company.com",
        image: "https://example.com/jane-avatar.jpg",
      },
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });

    render(<CreateSessionPage />);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@company.com")).toBeInTheDocument();
    expect(screen.getByAltText("Profile")).toHaveAttribute(
      "src",
      "https://example.com/jane-avatar.jpg",
    );
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("should handle missing user image gracefully", () => {
    // Business rule: Don't break when user has no profile image
    const mockSession = {
      user: {
        name: "No Image User",
        email: "noimage@example.com",
        // No image property
      },
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });

    render(<CreateSessionPage />);

    expect(screen.getByText("No Image User")).toBeInTheDocument();
    expect(screen.getByText("noimage@example.com")).toBeInTheDocument();
    expect(screen.queryByAltText("Profile")).not.toBeInTheDocument();
  });
});
