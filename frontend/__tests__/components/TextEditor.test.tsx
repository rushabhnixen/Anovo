import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import TextEditor from "@/components/TextEditor";

// jsdom implements no layout, but ProseMirror asks for caret coordinates when
// it scrolls the selection into view after a transaction. Without these it
// throws "getClientRects is not a function" on any key that edits the doc.
beforeAll(() => {
  const emptyRectList = Object.assign([] as unknown as DOMRectList, {
    item: () => null,
  });
  const zeroRect = {
    x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
    toJSON: () => ({}),
  } as DOMRect;

  for (const proto of [Range.prototype, Element.prototype]) {
    proto.getClientRects = () => emptyRectList;
    proto.getBoundingClientRect = () => zeroRect;
  }
});

function Harness({ initial = "", onSubmit }: { initial?: string; onSubmit?: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TextEditor value={value} onChange={setValue} onSubmit={onSubmit} />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe("TextEditor treats input as plain text (BUG-044)", () => {
  it("does not turn typed HTML into real markup", () => {
    render(<Harness initial={'<h1>Hello</h1><script>alert("test")</script>'} />);

    // The literal characters must survive, not be parsed into a heading.
    expect(screen.getByTestId("value")).toHaveTextContent(
      '<h1>Hello</h1><script>alert("test")</script>',
    );
    // No heading node, and certainly no script element, was created.
    expect(document.querySelector(".ProseMirror h1")).toBeNull();
    expect(document.querySelector(".ProseMirror script")).toBeNull();
  });

  it("keeps HTML literal in the editor's own text content", () => {
    render(<Harness initial="<b>bold</b>" />);
    const editor = document.querySelector(".ProseMirror");
    expect(editor?.textContent).toContain("<b>bold</b>");
    expect(editor?.querySelector("b")).toBeNull();
  });

  it("round-trips multi-line text without adding blank lines", () => {
    render(<Harness initial={"first line\nsecond line"} />);
    expect(screen.getByTestId("value")).toHaveTextContent("first line second line");
    // Exactly two paragraphs — not three, which is what a mismatched block
    // separator would produce.
    expect(document.querySelectorAll(".ProseMirror p")).toHaveLength(2);
  });
});

describe("Ctrl+Enter handling (BUG-047)", () => {
  it("fires onSubmit without inserting a newline", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness initial="Draft text" onSubmit={onSubmit} />);

    const editor = document.querySelector(".ProseMirror") as HTMLElement;
    editor.focus();
    await user.keyboard("{Control>}{Enter}{/Control}");

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // The draft is unchanged: no stray paragraph break was added.
    expect(screen.getByTestId("value")).toHaveTextContent("Draft text");
    expect(document.querySelectorAll(".ProseMirror p")).toHaveLength(1);
  });

  it("leaves a plain Enter alone", async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<Harness initial="Draft text" onSubmit={onSubmit} />);

    const editor = document.querySelector(".ProseMirror") as HTMLElement;
    editor.focus();
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
