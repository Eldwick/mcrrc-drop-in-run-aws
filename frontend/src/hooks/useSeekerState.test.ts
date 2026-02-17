import { describe, it, expect } from "vitest";
import { seekerReducer, initialState } from "./useSeekerState";

describe("seekerReducer — bottom sheet auto-open", () => {
  const location = { lat: 39.14, lng: -77.15 };

  describe("when setting location completes the search (pace already set)", () => {
    it("auto-opens sheet to half when location is set via SET_USER_LOCATION", () => {
      const stateWithPace = seekerReducer(initialState, {
        type: "SET_SELECTED_PACE",
        pace: "9_to_10",
      });
      // Pace set but no location yet — sheet stays collapsed
      expect(stateWithPace.sheetState).toBe("collapsed");

      const stateWithBoth = seekerReducer(stateWithPace, {
        type: "SET_USER_LOCATION",
        location,
        displayName: "Bethesda, MD",
      });
      expect(stateWithBoth.sheetState).toBe("half");
    });

    it("auto-opens sheet to half when location is set via map click", () => {
      const stateWithPace = seekerReducer(initialState, {
        type: "SET_SELECTED_PACE",
        pace: "sub_8",
      });
      const stateWithBoth = seekerReducer(stateWithPace, {
        type: "SET_USER_LOCATION",
        location,
      });
      expect(stateWithBoth.sheetState).toBe("half");
    });
  });

  describe("when setting pace completes the search (location already set)", () => {
    it("auto-opens sheet to half when pace is selected", () => {
      const stateWithLocation = seekerReducer(initialState, {
        type: "SET_USER_LOCATION",
        location,
        displayName: "20814",
      });
      expect(stateWithLocation.sheetState).toBe("collapsed");

      const stateWithBoth = seekerReducer(stateWithLocation, {
        type: "SET_SELECTED_PACE",
        pace: "8_to_9",
      });
      expect(stateWithBoth.sheetState).toBe("half");
    });
  });

  describe("does not auto-open when only one input is provided", () => {
    it("stays collapsed when only location is set", () => {
      const state = seekerReducer(initialState, {
        type: "SET_USER_LOCATION",
        location,
        displayName: "Rockville, MD",
      });
      expect(state.sheetState).toBe("collapsed");
    });

    it("stays collapsed when only pace is set", () => {
      const state = seekerReducer(initialState, {
        type: "SET_SELECTED_PACE",
        pace: "10_plus",
      });
      expect(state.sheetState).toBe("collapsed");
    });
  });

  describe("does not override user-controlled sheet position", () => {
    it("does not change sheet from half to half when updating location", () => {
      // Set pace first
      let state = seekerReducer(initialState, {
        type: "SET_SELECTED_PACE",
        pace: "9_to_10",
      });
      // User manually opens sheet to full
      state = seekerReducer(state, {
        type: "SET_SHEET_STATE",
        sheetState: "full",
      });
      expect(state.sheetState).toBe("full");

      // Now set location — should NOT override user's "full" choice back to "half"
      state = seekerReducer(state, {
        type: "SET_USER_LOCATION",
        location,
        displayName: "Silver Spring, MD",
      });
      expect(state.sheetState).toBe("full");
    });

    it("does not change sheet from full to half when updating pace", () => {
      let state = seekerReducer(initialState, {
        type: "SET_USER_LOCATION",
        location,
      });
      state = seekerReducer(state, {
        type: "SET_SHEET_STATE",
        sheetState: "full",
      });
      state = seekerReducer(state, {
        type: "SET_SELECTED_PACE",
        pace: "sub_8",
      });
      expect(state.sheetState).toBe("full");
    });
  });

  describe("does not re-trigger auto-open when changing pace after initial search", () => {
    it("stays collapsed if user collapsed the sheet and then changes pace", () => {
      // Complete search: location + pace
      let state = seekerReducer(initialState, {
        type: "SET_USER_LOCATION",
        location,
      });
      state = seekerReducer(state, {
        type: "SET_SELECTED_PACE",
        pace: "8_to_9",
      });
      expect(state.sheetState).toBe("half");

      // User collapses
      state = seekerReducer(state, {
        type: "SET_SHEET_STATE",
        sheetState: "collapsed",
      });

      // User changes pace — should NOT auto-open because pace was already set
      state = seekerReducer(state, {
        type: "SET_SELECTED_PACE",
        pace: "9_to_10",
      });
      expect(state.sheetState).toBe("collapsed");
    });
  });

  describe("SELECT_RUN collapses sheet to show selected card", () => {
    it("keeps sheet collapsed when a run is selected from collapsed state", () => {
      const state = seekerReducer(initialState, {
        type: "SELECT_RUN",
        runId: "1",
      });
      expect(state.sheetState).toBe("collapsed");
      expect(state.selectedRunId).toBe("1");
    });

    it("collapses sheet from half when a run is selected", () => {
      let state = seekerReducer(initialState, {
        type: "SET_SHEET_STATE",
        sheetState: "half",
      });
      state = seekerReducer(state, {
        type: "SELECT_RUN",
        runId: "1",
      });
      expect(state.sheetState).toBe("collapsed");
    });

    it("collapses sheet from full when a run is selected", () => {
      let state = seekerReducer(initialState, {
        type: "SET_SHEET_STATE",
        sheetState: "full",
      });
      state = seekerReducer(state, {
        type: "SELECT_RUN",
        runId: "1",
      });
      expect(state.sheetState).toBe("collapsed");
    });
  });

  describe("SET_SHEET_STATE allows manual control", () => {
    it("sets sheet to any state", () => {
      let state = seekerReducer(initialState, {
        type: "SET_SHEET_STATE",
        sheetState: "half",
      });
      expect(state.sheetState).toBe("half");

      state = seekerReducer(state, {
        type: "SET_SHEET_STATE",
        sheetState: "full",
      });
      expect(state.sheetState).toBe("full");

      state = seekerReducer(state, {
        type: "SET_SHEET_STATE",
        sheetState: "collapsed",
      });
      expect(state.sheetState).toBe("collapsed");
    });
  });
});
