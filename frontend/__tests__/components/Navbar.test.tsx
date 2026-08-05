import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/components/Navbar";

let mockPathname = "/";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn() }),
}));

type AuthState = { user: unknown; loading: boolean };
let mockAuth: AuthState = { user: null, loading: false };

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    ...mockAuth,
    token: null,
    logout: jest.fn(),
    login: jest.fn(),
    refreshUser: jest.fn(),
  }),
}));

const signedInUser = {
  id: 1,
  username: "rushabh",
  email: "user@example.com",
  is_premium: false,
  is_admin: false,
};

beforeEach(() => {
  mockPathname = "/";
  mockAuth = { user: null, loading: false };
});

describe("Navbar auth state on reload (BUG-001)", () => {
  it("does not flash the signed-out buttons while auth is still restoring", () => {
    mockAuth = { user: null, loading: true };
    render(<Navbar />);

    // A logged-in user reloading the page must not momentarily see these.
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
    expect(screen.getByTestId("auth-placeholder")).toBeInTheDocument();
  });

  it("shows the signed-out buttons once auth has resolved with no user", () => {
    mockAuth = { user: null, loading: false };
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("auth-placeholder")).not.toBeInTheDocument();
  });

  it("shows the username once auth has resolved with a user", () => {
    mockAuth = { user: signedInUser, loading: false };
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "rushabh" })).toBeInTheDocument();
  });

  it("does not offer the PRO upgrade before auth resolves", () => {
    mockAuth = { user: null, loading: true };
    render(<Navbar />);

    expect(screen.queryByRole("button", { name: "Upgrade to PRO" })).not.toBeInTheDocument();
  });
});

describe("mobile menu (BUG-003)", () => {
  it("closes when navigating home via the logo, which sits outside the menu panel", async () => {
    const user = userEvent.setup();
    mockPathname = "/summarize";
    const { rerender } = render(<Navbar />);

    await user.click(screen.getByRole("button", { name: "Toggle menu" }));
    expect(screen.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // The logo is a plain <Link> with no onClick, so only a route-change effect
    // can close the panel. Simulate the resulting navigation.
    mockPathname = "/";
    rerender(<Navbar />);

    expect(screen.getByRole("button", { name: "Toggle menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("still closes when a link inside the panel is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("link", { name: "Unified workspace" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on the first click of the hamburger", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const toggle = screen.getByRole("button", { name: "Toggle menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
