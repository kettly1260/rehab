export const V7_PRIMITIVES = Object.freeze({
    surface: 'v7-surface',
    softGlass: 'v7-soft-glass',
    liquidControl: 'v7-liquid-control',
    button: 'v7-button',
    chip: 'v7-chip',
    field: 'v7-field',
    listRow: 'v7-list-row',
    tabs: 'v7-tabs',
    tab: 'v7-tab',
    modal: 'v7-modal',
    sheet: 'v7-sheet',
    secondary: 'v7-secondary-surface',
    toast: 'v7-secondary-toast',
    state: 'v7-secondary-state'
});

export function addPrimitive(element, primitive) {
    const className = V7_PRIMITIVES[primitive] || primitive;
    if (element?.classList && className) element.classList.add(className);
    return element;
}
