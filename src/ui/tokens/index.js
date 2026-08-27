export const V7_TOKEN_NAMES = Object.freeze({
    background: '--v7-bg',
    surface: '--v7-surface',
    primary: '--v7-primary',
    info: '--v7-info',
    warning: '--v7-warning',
    stretch: '--v7-stretch',
    text: '--v7-text',
    mutedText: '--v7-text-muted',
    border: '--v7-border',
    navHeight: '--v7-nav-height',
    ctaHeight: '--v7-cta-height',
    motionFast: '--v7-motion-fast',
    motionNormal: '--v7-motion-normal'
});

export function readV7Token(name, element = document.documentElement) {
    const token = V7_TOKEN_NAMES[name] || name;
    return getComputedStyle(element).getPropertyValue(token).trim();
}

