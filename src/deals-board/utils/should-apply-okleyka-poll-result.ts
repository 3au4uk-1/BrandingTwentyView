export type OkleykaPollResultGuard = {
  sendGeneration: number;
  currentGeneration: number;
  sendLineItemId: string;
  currentLineItemId: string | null | undefined;
};

export function shouldApplyOkleykaPollResult({
  sendGeneration,
  currentGeneration,
  sendLineItemId,
  currentLineItemId,
}: OkleykaPollResultGuard): boolean {
  return (
    sendGeneration === currentGeneration &&
    currentLineItemId != null &&
    sendLineItemId === currentLineItemId
  );
}
