type StripUndefined<T extends object> = {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};
export declare function stripUndefined<T extends object>(object: T): StripUndefined<T>;
export {};
//# sourceMappingURL=object-utils.d.ts.map