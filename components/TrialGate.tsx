import React, { useEffect, useState } from "react";
import { ensureUserEntitlement, getAccessStatus } from "../services/accessControl";

type Props = {
  children: React.ReactNode;
  onBlocked?: () => void; // opcional
};

export const TrialGate: React.FC<Props> = ({ children, onBlocked }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await ensureUserEntitlement();
        const status = await getAccessStatus();
        setAllowed(status.allowed);
        if (!status.allowed) onBlocked?.();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null; // ou um skeleton
  if (!allowed) return null;

  return <>{children}</>;
};
