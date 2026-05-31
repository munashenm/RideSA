import { Suspense } from "react";
import PaymentCallbackContent from "./PaymentCallbackContent";

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-20 text-center text-muted">
          Confirming payment…
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
