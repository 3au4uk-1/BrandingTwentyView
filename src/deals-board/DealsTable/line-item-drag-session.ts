/** Ephemeral bridge so DealsDataTable can drive line-item reorder
 *  the same way it drives column resize (sandbox-safe pointer routing). */
type LineItemDragHandlers = {
  onMove: (clientY: number) => void;
  onEnd: () => void;
  onCancel: () => void;
};

let active: LineItemDragHandlers | null = null;

export const lineItemDragSession = {
  set(handlers: LineItemDragHandlers | null) {
    active = handlers;
  },
  isActive() {
    return active !== null;
  },
  move(clientY: number) {
    active?.onMove(clientY);
  },
  end() {
    const handlers = active;
    if (!handlers) return;
    handlers.onEnd();
  },
  cancel() {
    const handlers = active;
    if (!handlers) return;
    handlers.onCancel();
  },
};
