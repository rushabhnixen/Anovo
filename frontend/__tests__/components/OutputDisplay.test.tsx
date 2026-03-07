import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutputDisplay from "@/components/OutputDisplay";

// Mock TextToSpeech as it depends on browser SpeechSynthesis API
jest.mock("@/components/TextToSpeech", () => {
  return function MockTTS() {
    return <div data-testid="tts" />;
  };
});

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

describe("OutputDisplay", () => {
  it("renders the label", () => {
    render(<OutputDisplay text="" label="Result" />);
    expect(screen.getByText("Result")).toBeInTheDocument();
  });

  it("shows placeholder when text is empty", () => {
    render(<OutputDisplay text="" />);
    expect(screen.getByText(/Results will appear here/)).toBeInTheDocument();
  });

  it("shows the output text", () => {
    render(<OutputDisplay text="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("does not show Copy button when text is empty", () => {
    render(<OutputDisplay text="" />);
    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
  });

  it("shows Copy button when text is present", () => {
    render(<OutputDisplay text="Some output" />);
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("copies text to clipboard when Copy is clicked", async () => {
    render(<OutputDisplay text="copy me" />);
    await userEvent.click(screen.getByText("Copy"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("copy me");
  });

  it("shows loading spinner when loading=true", () => {
    render(<OutputDisplay text="" loading />);
    expect(screen.getByText(/Processing/)).toBeInTheDocument();
  });

  it("renders TextToSpeech when text is present and not loading", () => {
    render(<OutputDisplay text="some output" loading={false} />);
    expect(screen.getByTestId("tts")).toBeInTheDocument();
  });

  it("does not render TextToSpeech when loading", () => {
    render(<OutputDisplay text="some output" loading />);
    expect(screen.queryByTestId("tts")).not.toBeInTheDocument();
  });
});
