export function stripUndefined(object) {
    const entries = Object.entries(object).filter(([, value]) => value !== undefined);
    return Object.fromEntries(entries);
}
//# sourceMappingURL=object-utils.js.map