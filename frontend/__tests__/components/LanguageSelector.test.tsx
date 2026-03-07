import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSelector from "@/components/LanguageSelector";

describe("LanguageSelector", () => {
  const onChange = jest.fn();

  beforeEach(() => onChange.mockClear());

  it("renders the label", () => {
    render(<LanguageSelector label="Source" value="en" onChange={onChange} />);
    expect(screen.getByText("Source")).toBeInTheDocument();
  });

  it("renders at least 50 language options", () => {
    render(<LanguageSelector label="Target" value="fr" onChange={onChange} />);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThanOrEqual(50);
  });

  it("selects the current value", () => {
    render(<LanguageSelector label="Source" value="de" onChange={onChange} />);
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("de");
  });

  it("excludes the language specified via exclude prop", () => {
    render(<LanguageSelector label="Target" value="fr" onChange={onChange} exclude="en" />);
    const options = screen.getAllByRole("option");
    const codes = options.map((o) => (o as HTMLOptionElement).value);
    expect(codes).not.toContain("en");
  });

  it("calls onChange with the selected language code", async () => {
    render(<LanguageSelector label="Target" value="en" onChange={onChange} />);
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "fr");
    expect(onChange).toHaveBeenCalledWith("fr");
  });
});
