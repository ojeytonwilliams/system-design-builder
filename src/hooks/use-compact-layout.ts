import { useEffect, useState } from "react";

const useCompactLayout = (breakpoint: number): boolean => {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const sync = () => {
      setIsCompact(window.innerWidth <= breakpoint);
    };

    sync();
    window.addEventListener("resize", sync);

    return () => window.removeEventListener("resize", sync);
  }, [breakpoint]);

  return isCompact;
};

export { useCompactLayout };
