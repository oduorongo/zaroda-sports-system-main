import { useEffect } from 'react';

// WHY: dev-only guard that surfaces accidental secret exposure in DOM output.
export const SecurityCheck = () => {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const sensitivePatterns = ['service_role', 'sk-proj', 'sk-live'];
    const bundleText = document.documentElement.innerHTML;
    sensitivePatterns.forEach((pattern) => {
      if (bundleText.includes(pattern)) {
        console.error(`SECURITY WARNING: "${pattern}" found in DOM`);
      }
    });
  }, []);

  return null;
};