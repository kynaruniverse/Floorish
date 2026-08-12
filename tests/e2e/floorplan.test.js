import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import FloorPlan from '../../src/routes/home/[id]/+page.svelte';
import { page } from '$app/stores';

// Mock page store
vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn((fn) => {
      fn({ params: { id: 'test-home-id' } });
      return () => {};
    })
  }
}));

describe('Floor Plan Page', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should render the toolbar', async () => {
    const { getByText } = render(FloorPlan);
    
    await waitFor(() => {
      expect(getByText('Select')).toBeTruthy();
      expect(getByText('Wall')).toBeTruthy();
    });
  });

  it('should activate wall tool on click', async () => {
    const { getByText } = render(FloorPlan);
    
    const wallButton = getByText('Wall');
    await fireEvent.click(wallButton);
    
    // Check that the button has active styling
    expect(wallButton.closest('.tool-btn').classList.contains('active')).toBe(true);
  });

  it('should show empty state when no rooms', async () => {
    const { getByText } = render(FloorPlan);
    
    await waitFor(() => {
      expect(getByText('Draw your floor plan')).toBeTruthy();
    });
  });

  it('should show finish room button when drawing', async () => {
    const { getByText } = render(FloorPlan);
    
    // Start wall tool
    await fireEvent.click(getByText('Wall'));
    
    // Should show finish and cancel buttons
    expect(getByText('Finish Room')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });
});