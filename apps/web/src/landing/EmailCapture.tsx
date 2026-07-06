import { useState } from 'preact/hooks';

/**
 * MailerLite embedded-form capture. Two instances on the page (guarantee tease +
 * early access) post to two different MailerLite forms — that IS the "tagged by
 * source" requirement: each form feeds the same list under its own group.
 *
 * Config is baked at build time (VITE_ML_*, see deploy/.env.example). Without it the
 * form renders visibly disabled instead of pretending to work — honesty over polish.
 */

const ACCOUNT = (import.meta.env.VITE_ML_ACCOUNT as string | undefined) || undefined;

interface Props {
  formId: string | undefined;
  /** Button label, e.g. "Notify me" / "Keep me posted". */
  cta: string;
  /** Unique id prefix for label/input wiring (two forms share the page). */
  idPrefix: string;
}

type Status = 'idle' | 'sending' | 'done' | 'error';

export function EmailCapture({ formId, cta, idPrefix }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const configured = Boolean(ACCOUNT && formId);
  const inputId = `${idPrefix}-email`;

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!configured || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch(
        `https://assets.mailerlite.com/jsonp/${ACCOUNT}/forms/${formId}/subscribe`,
        {
          method: 'POST',
          body: new URLSearchParams({ 'fields[email]': email, 'ml-submit': '1', anticsrf: 'true' }),
        },
      );
      const data: unknown = await res.json().catch(() => null);
      const success =
        res.ok && !(typeof data === 'object' && data !== null && (data as { success?: boolean }).success === false);
      setStatus(success ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <p class="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-900" role="status">
        You're on the list — watch your inbox for a confirmation email.
      </p>
    );
  }

  return (
    <form class="space-y-2" onSubmit={(e) => void submit(e)}>
      <div class="flex flex-col gap-2 sm:flex-row">
        <label class="sr-only" for={inputId}>
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          disabled={!configured}
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          placeholder={configured ? 'you@example.com' : 'signup opens shortly'}
          class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={!configured || status === 'sending'}
          class="rounded-md bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : cta}
        </button>
      </div>
      <p class="text-xs text-slate-500" aria-live="polite">
        {status === 'error'
          ? "Couldn't subscribe right now — please try again in a minute."
          : configured
            ? 'No spam. Product updates only. Unsubscribe anytime.'
            : 'The launch list opens shortly — the checker below works today.'}
      </p>
    </form>
  );
}
