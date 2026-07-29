import { DealsBoard } from 'src/deals-board/DealsBoard';
import { BOARD_STREAM } from 'src/constants/product-stream';

/** Thin page wrapper so the front-component entry stays JSX-free like deals-board. */
export const DecorMkBoardPage = () => (
  <DealsBoard boardStream={BOARD_STREAM.DECOR_MK} />
);
