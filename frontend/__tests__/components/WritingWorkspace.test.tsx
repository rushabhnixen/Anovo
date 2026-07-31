import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WritingWorkspace from "@/components/WritingWorkspace";
import { paraphraseText } from "@/lib/api";

jest.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ token: null, user: null }),
}));

jest.mock("@/lib/api", () => ({
  paraphraseText: jest.fn(),
  humanizeText: jest.fn(),
  checkGrammar: jest.fn(),
  summarizeText: jest.fn(),
  translateText: jest.fn(),
  detectTone: jest.fn(),
  refineParaphrase: jest.fn(),
}));

const mockedParaphrase = paraphraseText as jest.MockedFunction<typeof paraphraseText>;

describe("WritingWorkspace output editing", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    mockedParaphrase.mockResolvedValue({
      original: "Draft text",
      paraphrased: "Improved text.",
      intensity: 3,
      model_used: "standard",
      writing_mode: "standard",
    });
  });

  it("lets a user directly edit a generated result and keeps edits copyable", async () => {
    const user = userEvent.setup();
    render(<WritingWorkspace />);

    await user.type(screen.getByLabelText("Text to paraphrase"), "Draft text");
    const paraphraseButtons = screen.getAllByRole("button", { name: "Paraphrase" });
    await user.click(paraphraseButtons[paraphraseButtons.length - 1]);

    await screen.findByText("Improved");
    await user.click(screen.getByRole("button", { name: "Edit" }));

    const editor = screen.getByLabelText("Edit paraphrased text");
    await user.clear(editor);
    await user.type(editor, "My final edited result.");
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(screen.getByText("My")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy all" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });
});
