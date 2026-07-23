type StripUndefined<T extends object> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

export function stripUndefined<T extends object>(object: T): StripUndefined<T> {
  const entries = Object.entries(object).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as StripUndefined<T>;
}
