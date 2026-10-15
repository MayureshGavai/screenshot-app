import { useEffect } from "react";

export const useSystemTheme = () => {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme:dark)");

    const applyTheme = (isDark: boolean) => {
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    };

    applyTheme(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);
};
