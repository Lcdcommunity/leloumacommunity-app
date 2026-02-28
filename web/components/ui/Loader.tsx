//web/components/ui/Loader.tsx
export function Loader({ text = 'Chargement...' }: { text?: string }) {
  return <div className="loader">{text}</div>;
}