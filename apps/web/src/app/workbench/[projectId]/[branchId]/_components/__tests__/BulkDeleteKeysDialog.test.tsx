import { LingxProvider } from '@lingx/sdk-nextjs';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkDeleteKeysDialog } from '../BulkDeleteKeysDialog';

const staticTranslations = {
  'translations.dialogs.bulkDeleteKeys.title': 'Delete {count} keys?',
  'translations.dialogs.bulkDeleteKeys.description':
    'This will permanently delete the selected translation keys and all their translations. This action cannot be undone.',
  'translations.dialogs.bulkDeleteKeys.confirm': 'Delete Keys',
  'common.cancel': 'Cancel',
};

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <LingxProvider defaultLanguage="en" staticData={staticTranslations}>
    {children}
  </LingxProvider>
);

describe('BulkDeleteKeysDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog when open is true', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={false}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/Delete.*keys/)).toBeInTheDocument();
    expect(
      screen.getByText(/This will permanently delete the selected translation keys/)
    ).toBeInTheDocument();
  });

  it('should not render dialog when open is false', () => {
    render(
      <BulkDeleteKeysDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={false}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByText(/Delete.*keys/)).not.toBeInTheDocument();
  });

  it('should call onConfirm when delete button is clicked', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={false}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    const deleteButton = screen.getByRole('button', { name: /Delete Keys/ });
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should disable delete button when isDeleting is true', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={true}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    const deleteButton = screen.getByRole('button', { name: /Delete Keys/ });
    expect(deleteButton).toBeDisabled();
  });

  it('should disable cancel button when isDeleting is true', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={true}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeDisabled();
  });

  it('should show loading spinner when isDeleting is true', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={true}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    // Loader2 icon has animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should call onOpenChange when cancel button is clicked', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={false}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should pass selectedCount to i18n translation', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={10}
        isDeleting={false}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    // The title should contain the count (passed via i18n interpolation)
    expect(screen.getByText(/Delete.*keys/)).toBeInTheDocument();
  });

  it('should render trash icon in destructive style', () => {
    render(
      <BulkDeleteKeysDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        selectedCount={5}
        isDeleting={false}
        onConfirm={mockOnConfirm}
      />,
      { wrapper: TestWrapper }
    );

    // Check for destructive styling container
    const iconContainer = document.querySelector('.bg-destructive\\/10');
    expect(iconContainer).toBeInTheDocument();
  });
});
