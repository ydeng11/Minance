import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_END_DATE,
  DEFAULT_START_DATE,
  useDateRangeStore,
} from '../dateRangeStore';

const resetStore = () => {
  useDateRangeStore.setState({
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
    setDateRange: useDateRangeStore.getState().setDateRange,
  });
};

describe('useDateRangeStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('initializes with the current-year defaults', () => {
    const state = useDateRangeStore.getState();

    expect(state.startDate).toBe(DEFAULT_START_DATE);
    expect(state.endDate).toBe(DEFAULT_END_DATE);
  });

  it('updates the stored date range immutably', () => {
    const nextStart = '2025-01-15';
    const nextEnd = '2025-02-15';

    useDateRangeStore.getState().setDateRange(nextStart, nextEnd);

    const state = useDateRangeStore.getState();
    expect(state.startDate).toBe(nextStart);
    expect(state.endDate).toBe(nextEnd);
  });
});
