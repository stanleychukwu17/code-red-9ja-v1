export type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  [key: string]: any;
};

/**
 * Formats a successful response.
 * @param data Optional data to include in the response
 * @param message Optional success message
 * @returns An ApiResponse object with success: true
 */
export const respondSuccess = (data?: Record<string, any>, message?: string): ApiResponse => {
  return {
    success: true,
    ...(message ? { message } : {}),
    ...(data || {}),
  };
};

/**
 * Formats an error response.
 * @param message The error message to display to the user
 * @returns An ApiResponse object with success: false
 */
export const respondError = (message: string): ApiResponse => {
  return {
    success: false,
    message,
  };
};
