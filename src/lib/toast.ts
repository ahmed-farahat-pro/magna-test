// A tiny, decoupled toast bus. Any component can call toast.success(...) without
// being wrapped in a provider — it dispatches a window CustomEvent that the single
// <Toaster/> in the layout listens for. In-app feedback, never a browser dialog.

export type ToastKind = "success" | "error" | "info";
export type ToastPayload = { id: number; kind: ToastKind; message: string };

const EVENT = "nova-toast";
let seq = 0;

function emit(kind: ToastKind, message: string) {
  if (typeof window === "undefined") return;
  const detail: ToastPayload = { id: ++seq, kind, message };
  window.dispatchEvent(new CustomEvent(EVENT, { detail }));
}

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  info: (message: string) => emit("info", message),
};

export const TOAST_EVENT = EVENT;
