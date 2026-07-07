import { useRef, useState } from 'preact/hooks';

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
}

export function DropZone({ onFile, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Choose or drop an SVG or DXF file to check"
      aria-busy={busy}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) onFile(file);
      }}
      class={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
        dragOver
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950'
          : 'border-slate-300 bg-white hover:border-amber-400 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-amber-500'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".svg,.dxf,image/svg+xml"
        class="sr-only"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) onFile(file);
          e.currentTarget.value = ''; // same file can be re-picked after edits
        }}
      />
      <p class="text-lg font-semibold text-slate-800 dark:text-slate-200">
        {busy ? 'Checking…' : 'Drop your SVG or DXF here'}
      </p>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {busy ? 'Running the structural checks in your browser.' : 'or click to choose a file — up to 15 MB'}
      </p>
      <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Your file never leaves this browser. All checks run locally.
      </p>
    </div>
  );
}
