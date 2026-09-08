import { useEffect, useState } from "react";

const QUERY = "(max-width: 700px)";

function matches() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
