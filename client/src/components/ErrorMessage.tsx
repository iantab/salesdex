import "./ErrorMessage.css";

interface Props {
  error: unknown;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}

export function ErrorMessage({ error }: Props) {
  return (
    <div className="error-message" role="alert">
      <span className="error-icon">⚠</span>
      {errorMessage(error)}
    </div>
  );
}
