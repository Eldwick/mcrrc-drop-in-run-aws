import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaceSelector } from "./PaceSelector";
import type { PaceSelectorHandle } from "./PaceSelector";

describe("PaceSelector", () => {
  const defaultProps = {
    selectedPace: null as null,
    onSelectPace: vi.fn(),
  };

  describe("ARIA attributes", () => {
    it("renders a radiogroup container", () => {
      render(<PaceSelector {...defaultProps} />);
      expect(screen.getByRole("radiogroup")).toBeDefined();
    });

    it("renders 4 radio buttons", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      expect(radios).toHaveLength(4);
    });

    it("sets aria-checked on the selected pace", () => {
      render(<PaceSelector {...defaultProps} selectedPace="9_to_10" />);
      const radios = screen.getAllByRole("radio");
      expect(radios[0].getAttribute("aria-checked")).toBe("false");
      expect(radios[1].getAttribute("aria-checked")).toBe("false");
      expect(radios[2].getAttribute("aria-checked")).toBe("true");
      expect(radios[3].getAttribute("aria-checked")).toBe("false");
    });

    it("sets all aria-checked to false when no pace is selected", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios.forEach((radio) => {
        expect(radio.getAttribute("aria-checked")).toBe("false");
      });
    });
  });

  describe("roving tabindex", () => {
    it("gives tabIndex 0 to first button when no pace is selected", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      expect(radios[0].tabIndex).toBe(0);
      expect(radios[1].tabIndex).toBe(-1);
      expect(radios[2].tabIndex).toBe(-1);
      expect(radios[3].tabIndex).toBe(-1);
    });

    it("gives tabIndex 0 to the selected pace button", () => {
      render(<PaceSelector {...defaultProps} selectedPace="8_to_9" />);
      const radios = screen.getAllByRole("radio");
      expect(radios[0].tabIndex).toBe(-1);
      expect(radios[1].tabIndex).toBe(0);
      expect(radios[2].tabIndex).toBe(-1);
      expect(radios[3].tabIndex).toBe(-1);
    });
  });

  describe("arrow key navigation", () => {
    it("moves focus right with ArrowRight", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios[0].focus();
      fireEvent.keyDown(radios[0], { key: "ArrowRight" });
      expect(document.activeElement).toBe(radios[1]);
    });

    it("moves focus left with ArrowLeft", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios[1].focus();
      fireEvent.keyDown(radios[1], { key: "ArrowLeft" });
      expect(document.activeElement).toBe(radios[0]);
    });

    it("wraps from last to first with ArrowRight", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios[3].focus();
      fireEvent.keyDown(radios[3], { key: "ArrowRight" });
      expect(document.activeElement).toBe(radios[0]);
    });

    it("wraps from first to last with ArrowLeft", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios[0].focus();
      fireEvent.keyDown(radios[0], { key: "ArrowLeft" });
      expect(document.activeElement).toBe(radios[3]);
    });

    it("moves focus with ArrowDown (alias for ArrowRight)", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios[0].focus();
      fireEvent.keyDown(radios[0], { key: "ArrowDown" });
      expect(document.activeElement).toBe(radios[1]);
    });

    it("moves focus with ArrowUp (alias for ArrowLeft)", () => {
      render(<PaceSelector {...defaultProps} />);
      const radios = screen.getAllByRole("radio");
      radios[1].focus();
      fireEvent.keyDown(radios[1], { key: "ArrowUp" });
      expect(document.activeElement).toBe(radios[0]);
    });
  });

  describe("imperative focus() handle", () => {
    it("focuses the first button when no pace is selected", () => {
      const ref = createRef<PaceSelectorHandle>();
      render(<PaceSelector {...defaultProps} ref={ref} />);
      const radios = screen.getAllByRole("radio");
      ref.current!.focus();
      expect(document.activeElement).toBe(radios[0]);
    });

    it("focuses the selected pace button", () => {
      const ref = createRef<PaceSelectorHandle>();
      render(<PaceSelector {...defaultProps} selectedPace="9_to_10" ref={ref} />);
      const radios = screen.getAllByRole("radio");
      ref.current!.focus();
      expect(document.activeElement).toBe(radios[2]);
    });
  });
});
