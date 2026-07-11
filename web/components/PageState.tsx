export default function PageState({ text, isError }: { text: string; isError?: boolean }) {
  return (
    <div className={`neo-card p-6 text-sm font-bold ${isError ? "bg-danger text-cream" : ""}`}>{text}</div>
  );
}
