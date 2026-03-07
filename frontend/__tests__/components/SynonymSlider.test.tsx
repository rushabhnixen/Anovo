import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import SynonymSlider from "@/components/SynonymSlider";

describe("SynonymSlider", () => {
  const onChange = jest.fn();

  beforeEach(() => onChange.mockClear());

  it("renders the intensity label", () => {
    render(<SynonymSlider value={3} onChange={onChange} />);
    expect(screen.getByText("Intensity")).toBeInTheDocument();
  });

  it("shows the current value and its label", () => {
    render(<SynonymSlider value={3} onChange={onChange} />);
    const matches = screen.getAllByText(/Standard/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a range input with correct bounds", () => {
    render(<SynonymSlider value={3} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "5");
    expect(slider).toHaveAttribute("step", "1");
    expect(slider).toHaveValue("3");
  });

  it("shows all five intensity labels", () => {
    render(<SynonymSlider value={1} onChange={onChange} />);
    expect(screen.getByText("Minimal")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Aggressive")).toBeInTheDocument();
  });

  it("calls onChange with a number when slider moves", () => {
    render(<SynonymSlider value={3} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("reflects value=1 as Minimal", () => {
    render(<SynonymSlider value={1} onChange={onChange} />);
    expect(screen.getByText(/1.*Minimal/)).toBeInTheDocument();
  });
});
