import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import EmptyState from '../../src/lib/components/EmptyState.svelte';

describe('EmptyState Component', () => {
  it('renders with default props', () => {
    const { getByText } = render(EmptyState);
    expect(getByText('Nothing here yet')).toBeTruthy();
  });

  it('renders custom title and description', () => {
    const { getByText } = render(EmptyState, {
      props: {
        title: 'Custom Title',
        description: 'Custom description text'
      }
    });
    expect(getByText('Custom Title')).toBeTruthy();
    expect(getByText('Custom description text')).toBeTruthy();
  });

  it('shows CTA button when provided', () => {
    const { getByText } = render(EmptyState, {
      props: {
        ctaText: 'Click Me',
        onCta: () => {}
      }
    });
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onCta when button clicked', async () => {
    let clicked = false;
    const { getByText } = render(EmptyState, {
      props: {
        ctaText: 'Click Me',
        onCta: () => { clicked = true; }
      }
    });
    
    await fireEvent.click(getByText('Click Me'));
    expect(clicked).toBe(true);
  });

  it('renders custom icon', () => {
    const { container } = render(EmptyState, {
      props: { icon: '🎉' }
    });
    expect(container.querySelector('.empty-icon').textContent).toBe('🎉');
  });
});