/** Same-turn click: list option vs full-board dismiss overlay (Twenty Remote DOM). */

export type PickerClickGate = {
  noteOptionChosen: () => void;
  shouldApplyDismissCommit: () => boolean;
};

export const createPickerClickGate = (): PickerClickGate => {
  let optionChosen = false;
  return {
    noteOptionChosen() {
      optionChosen = true;
    },
    shouldApplyDismissCommit() {
      return !optionChosen;
    },
  };
};

/** Run dismiss after the current pointer/mouse handlers so an option click wins. */
export const scheduleDismissCommit = (gate: PickerClickGate, onDismiss: () => void): void => {
  queueMicrotask(() => {
    if (gate.shouldApplyDismissCommit()) {
      onDismiss();
    }
  });
};
