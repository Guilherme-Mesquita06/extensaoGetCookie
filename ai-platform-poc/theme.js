(() => {
  window.AiPlatformPoC = window.AiPlatformPoC || {};

  function parseRgb(value) {
    if (!value || value === 'transparent') return null;
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].split(',').map(part => Number.parseFloat(part.trim()));
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
    const alpha = parts.length > 3 ? parts[3] : 1;
    if (alpha === 0) return null;
    return parts.slice(0, 3);
  }

  function luminance(rgb) {
    const [r, g, b] = rgb.map(value => {
      const normalized = value / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function detectPageTheme() {
    const candidates = [document.documentElement, document.body].filter(Boolean);
    for (const element of candidates) {
      const styles = getComputedStyle(element);
      const rgb = parseRgb(styles.backgroundColor);
      if (rgb) return luminance(rgb) < 0.42 ? 'dark' : 'light';
    }

    // Fallback when page backgrounds are transparent or detection is inconclusive.
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  window.AiPlatformPoC.detectModalTheme = () =>
    detectPageTheme() === 'dark' ? 'light' : 'dark';
})();