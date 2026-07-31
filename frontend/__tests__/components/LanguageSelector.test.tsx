import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSelector from "@/components/LanguageSelector";

describe("LanguageSelector", () => {
  const onChange = jest.fn();

  beforeEach(() => onChange.mockClear());

  it("renders the label and current language", () => {
    render(<LanguageSelector label="Source" value="de" onChange={onChange} />);
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveTextContent("German");
  });

  it("opens a searchable list with at least 50 languages", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector label="Target" value="fr" onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Target" }));
    expect(screen.getByRole("searchbox", { name: "Search target" })).toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBeGreaterThanOrEqual(50);
  });

  it("filters languages as the user types", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector label="Target" value="fr" onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Target" }));
    await user.type(screen.getByRole("searchbox", { name: "Search target" }), "japan");
    const listbox = screen.getByRole("listbox", { name: "Target options" });
    expect(within(listbox).getByRole("option", { name: /Japanese/i })).toBeInTheDocument();
    expect(within(listbox).queryByRole("option", { name: /French/i })).not.toBeInTheDocument();
  });

  it("excludes the language specified via exclude prop", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector label="Target" value="fr" onChange={onChange} exclude="en" />);
    await user.click(screen.getByRole("combobox", { name: "Target" }));
    expect(screen.queryByRole("option", { name: /English/i })).not.toBeInTheDocument();
  });

  it("includes language detection when requested", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector label="Source" value="auto" onChange={onChange} allowAuto />);
    await user.click(screen.getByRole("combobox", { name: "Source" }));
    expect(screen.getByRole("option", { name: "Detect language" })).toBeInTheDocument();
  });

  it("calls onChange with the selected language code", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector label="Target" value="en" onChange={onChange} />);
    await user.click(screen.getByRole("combobox", { name: "Target" }));
    await user.type(screen.getByRole("searchbox", { name: "Search target" }), "French");
    await user.click(screen.getByRole("option", { name: /French/i }));
    expect(onChange).toHaveBeenCalledWith("fr");
  });
});
