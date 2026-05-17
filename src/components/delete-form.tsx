"use client";

type DeleteAction = (formData: FormData) => Promise<void>;

export function DeleteForm({
  action,
  hidden,
  label,
  confirmText,
}: {
  action: DeleteAction;
  hidden: Record<string, string>;
  label: string;
  confirmText: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className="text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 text-sm"
      >
        {label}
      </button>
    </form>
  );
}
