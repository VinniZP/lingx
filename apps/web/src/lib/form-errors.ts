import type { FieldError } from '@lingx/shared';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/**
 * Maps API field errors to react-hook-form fields.
 *
 * When an API returns field-level validation errors (e.g., "email already exists"),
 * this utility maps them to the corresponding form fields so they display inline
 * rather than as toast notifications.
 *
 * @param error - The caught API error
 * @param setError - react-hook-form's setError function
 * @param fieldMapping - Optional mapping of API field names to form field names
 * @returns true if field errors were set (skip toast), false if error should be shown as toast
 *
 * @example
 * const onSubmit = async (data: FormData) => {
 *   try {
 *     await mutate(data);
 *   } catch (error) {
 *     // Try to map field errors first
 *     if (!handleApiFieldErrors(error, form.setError)) {
 *       // Only toast for non-field errors
 *       toast.error('Action failed');
 *     }
 *   }
 * };
 */
export function handleApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMapping?: Record<string, FieldPath<T>>
): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const fieldErrors = error.fieldErrors;

  if (!fieldErrors || fieldErrors.length === 0) {
    return false;
  }

  // Map each field error to the form
  for (const fieldError of fieldErrors) {
    const formField = fieldMapping?.[fieldError.field] ?? fieldError.field;
    setError(formField as FieldPath<T>, {
      type: 'server',
      message: fieldError.message,
    });
  }

  return true;
}

/**
 * Check if an error has field-level errors that can be displayed inline.
 */
function hasFieldErrors(error: unknown): error is ApiError & { fieldErrors: FieldError[] } {
  return (
    error instanceof ApiError && Array.isArray(error.fieldErrors) && error.fieldErrors.length > 0
  );
}
