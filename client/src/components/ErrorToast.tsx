import { useEffect } from 'react';
import { sfx } from '../sounds.ts';

export function ErrorToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    sfx.error();
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div className="toast" role="alert" onClick={onDismiss}>
      ⚠️ {message}
    </div>
  );
}
