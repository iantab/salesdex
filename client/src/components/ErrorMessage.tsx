import "./ErrorMessage.css";

interface Props {
  message: string;
}

export function ErrorMessage({ message }: Props) {
  return (
    <div className="error-message" role="alert">
      <span className="error-icon">⚠</span>
      {message}
    </div>
  );
}
