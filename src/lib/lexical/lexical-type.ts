import type { LexicalNode } from '@/lib/lexical/lexical-node.ts'

export type Spread<T1, T2> = Omit<T2, keyof T1> & T1

type GenericConstructor<T> = new (...args: any[]) => T
// https://github.com/microsoft/TypeScript/issues/3841
export type KlassConstructor<Cls extends GenericConstructor<any>> =
  GenericConstructor<InstanceType<Cls>> & { [k in keyof Cls]: Cls[k] }

export type Klass<T extends LexicalNode> =
  InstanceType<T['constructor']> extends T
    ? T['constructor']
    : GenericConstructor<T> & T['constructor']
