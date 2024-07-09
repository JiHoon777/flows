export function assignIf<OBJ_TYPE extends object, KEY extends keyof OBJ_TYPE>(
  obj: OBJ_TYPE,
  key: KEY,
  runIfHasOwnProperty: (value: NonNullable<OBJ_TYPE[KEY]>) => void,
) {
  const value = obj[key]
  if (value !== undefined) {
    runIfHasOwnProperty(value as NonNullable<OBJ_TYPE[KEY]>)
  }
}
