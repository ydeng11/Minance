import { ApiError } from "../api/client";

export function getRequestFeedbackMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return fallback;
  }

  const apiMessage = error.payload?.error?.message?.trim() || error.message.trim();
  const remediation = error.payload?.error?.details?.remediation?.trim();

  if (!apiMessage) {
    return fallback;
  }

  if (!remediation || apiMessage.includes(remediation)) {
    return apiMessage;
  }

  const separator = /[.!?]$/.test(apiMessage) ? " " : ": ";
  return `${apiMessage}${separator}${remediation}`;
}
