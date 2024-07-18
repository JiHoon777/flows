import { isArray, isPlainObject, mergeWith } from 'lodash-es'

export function customMerge<T, U>(object: T, source: U): T & U {
  return mergeWith({}, object, source, (objValue, srcValue) => {
    if (isArray(srcValue)) {
      return srcValue
    }
    if (isPlainObject(srcValue)) {
      return customMerge(objValue || {}, srcValue)
    }
  })
}
