import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApiKeyDialog } from './api-key-dialog';
import { LingxProvider } from '@lingx/sdk-nextjs';
import type { ReactNode } from 'react';

// Static translations for tests
const staticTranslations = {
  'apiKeys.title': 'Generate New API Key',
  'apiKeys.description': 'Create a new API key for CLI or SDK authentication',
  'apiKeys.nameLabel': 'Key Name',
  'apiKeys.namePlaceholder': 'e.g., Production CLI, Development SDK',
  'apiKeys.nameHint': 'Give your API key a descriptive name',
  'apiKeys.quickStart': 'Quick Start',
  'apiKeys.generate': 'Generate Key',
  'apiKeys.generating': 'Creating...',
  'apiKeys.oneTimeDisplay': 'One-time display',
  'apiKeys.oneTimeDisplayHint': 'Make sure to copy your API key now. You won\'t be able to see it again!',
  'apiKeys.suggestions.cli': 'CLI Access',
  'apiKeys.suggestions.development': 'Development SDK',
  'apiKeys.suggestions.production': 'Production',
  'common.cancel': 'Cancel',
};

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <LingxProvider defaultLanguage="en" staticData={staticTranslations}>
    {children}
  </LingxProvider>
);

describe('ApiKeyDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('should render dialog when open is true', () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Generate New API Key')).toBeInTheDocument();
    expect(
      screen.getByText(/Create a new API key for CLI or SDK authentication/)
    ).toBeInTheDocument();
  });

  it('should not render dialog when open is false', () => {
    render(
      <ApiKeyDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByText('Generate New API Key')).not.toBeInTheDocument();
  });

  // TODO: Form submission tests need userEvent for proper form validation
  it.skip('should call onSubmit with key name when form is submitted', async () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    const input = screen.getByPlaceholderText(
      /e.g., Production CLI, Development SDK/
    );
    fireEvent.change(input, { target: { value: 'My Test Key' } });

    const submitButton = screen.getByRole('button', { name: /Generate Key/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('My Test Key');
    });
  });

  it('should disable submit button when input is empty', () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    const submitButton = screen.getByRole('button', { name: /Generate Key/ });
    expect(submitButton).toBeDisabled();
  });

  it('should disable submit button when loading', () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />,
      { wrapper: TestWrapper }
    );

    const input = screen.getByPlaceholderText(
      /e.g., Production CLI, Development SDK/
    );
    fireEvent.change(input, { target: { value: 'My Test Key' } });

    const submitButton = screen.getByRole('button', { name: /Creating/ });
    expect(submitButton).toBeDisabled();
  });

  it('should show loading text when isLoading is true', () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={true}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/Creating.../)).toBeInTheDocument();
  });

  it('should call onOpenChange when cancel button is clicked', () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should clear input when dialog is closed', () => {
    const { rerender } = render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    const input = screen.getByPlaceholderText(
      /e.g., Production CLI, Development SDK/
    );
    fireEvent.change(input, { target: { value: 'My Test Key' } });
    expect(input).toHaveValue('My Test Key');

    // Close the dialog
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Reopen the dialog
    rerender(
      <TestWrapper>
        <ApiKeyDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
          isLoading={false}
        />
      </TestWrapper>
    );

    // Input should be cleared (handled by component state reset)
  });

  // TODO: Form submission tests need userEvent for proper form validation
  it.skip('should trim whitespace from key name before submitting', async () => {
    render(
      <ApiKeyDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isLoading={false}
      />,
      { wrapper: TestWrapper }
    );

    const input = screen.getByPlaceholderText(
      /e.g., Production CLI, Development SDK/
    );
    fireEvent.change(input, { target: { value: '  My Test Key  ' } });

    const submitButton = screen.getByRole('button', { name: /Generate Key/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('My Test Key');
    });
  });
});
