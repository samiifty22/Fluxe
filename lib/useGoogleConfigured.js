import { useEffect, useState } from "react";

// null = still checking, true/false = known. Lets pages fail gracefully instead of
// redirecting to a broken Google OAuth screen when credentials aren't set yet.
export function useGoogleConfigured() {
  const [configured, setConfigured] = useState(null);
  useEffect(() => {
    fetch("/api/auth/google-status")
      .then(r => r.json())
      .then(d => setConfigured(!!d.configured))
      .catch(() => setConfigured(false));
  }, []);
  return configured;
}
