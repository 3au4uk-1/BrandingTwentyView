import { describe, expect, it } from 'vitest';

import { getPrintSendUiState, isEmptyPrintSession } from './print-send-state';

describe('getPrintSendUiState', () => {
  it('needs datetime when date or time missing', () => {
    expect(
      getPrintSendUiState({ date: '', time: '10:00', requested: false, sessionId: null, stage: 'V_PECHATI' }),
    ).toBe('need_datetime');
  });

  it('ready when date+time and not requested and no session', () => {
    expect(
      getPrintSendUiState({
        date: '2026-08-05',
        time: '10:00',
        requested: false,
        sessionId: null,
        stage: 'NOVYY',
      }),
    ).toBe('ready');
  });

  it('need_stage when requested but not V_PECHATI', () => {
    expect(
      getPrintSendUiState({
        date: '2026-08-05',
        time: '10:00',
        requested: true,
        sessionId: null,
        stage: 'NOVYY',
      }),
    ).toBe('need_stage');
  });

  it('sending when requested + V_PECHATI + no session', () => {
    expect(
      getPrintSendUiState({
        date: '2026-08-05',
        time: '10:00',
        requested: true,
        sessionId: '',
        stage: 'V_PECHATI',
      }),
    ).toBe('sending');
  });

  it('queued when session present', () => {
    expect(
      getPrintSendUiState({
        date: '2026-08-05',
        time: '10:00',
        requested: false,
        sessionId: 'sess',
        stage: 'V_PECHATI',
      }),
    ).toBe('queued');
  });
});

describe('isEmptyPrintSession', () => {
  it('treats null, undefined, empty and whitespace as empty', () => {
    expect(isEmptyPrintSession(null)).toBe(true);
    expect(isEmptyPrintSession(undefined)).toBe(true);
    expect(isEmptyPrintSession('')).toBe(true);
    expect(isEmptyPrintSession('   ')).toBe(true);
  });

  it('treats non-empty string as present session', () => {
    expect(isEmptyPrintSession('sess')).toBe(false);
  });
});
