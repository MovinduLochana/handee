/**
 * A generic placeholder page used for scaffolding routes before their
 * definitive implementation in later phases.
 */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8 text-foreground">
      <h1 className="text-3xl font-semibold mb-4 tracking-tight">{title}</h1>
      <p className="text-muted-foreground leading-relaxed max-w-150">
        This page represents the <strong className="text-foreground">{title}</strong> route. It is
        currently a placeholder awaiting full implementation in the respective development phase.
      </p>
    </div>
  );
}
