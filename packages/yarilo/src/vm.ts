//
// Copyright © 2020 Anticrm Platform Contributors.
// 
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Subscription } from './async'

type Dict = { [key: string]: any }
export type ProcFunctions = { [key: string]: (pc: PC) => any }
export type Proc = { __params: any }

export enum WordKind {
  Norm = 0,
  Get,
  Set,
  Quote
}

type BindFactory = (sym: string) => Bound | undefined
export type Bound = { 
  get: (sym: string) => any
  set: (sym: string, value: any) => void
}

export abstract class CodeItem {
  abstract bind(factory: BindFactory): void
  abstract exec(pc: PC): any
}

export type Code = CodeItem[]

function checkReturn(result: any, pc: PC): any {
  if (typeof result === 'function') {
    return result(pc)
  } else if (result && typeof result === 'object' && result.hasOwnProperty('__params')) {
    return (result as ProcFunctions).default(pc)
  } else {
    return result
  }
}

export class Word extends CodeItem {
  private kind: WordKind
  readonly sym: string
  private infix: boolean
  private bound?: Bound

  constructor(kind: WordKind, sym: string) {
    super ()
    this.kind = kind
    this.sym = sym
    this.infix = '+-|*>='.indexOf(sym.charAt(0)) !== -1 && kind === WordKind.Norm
  }

  bind(f: BindFactory) {
    const bound = f(this.sym)
    if (bound) this.bound = bound
  }

  exec (pc: PC): any {
    if (!this.bound)
      throw new Error('word not bound ' + this.sym)
    switch (this.kind) {
      case WordKind.Set: 
        const x = pc.next()
        this.bound.set(this.sym, x)
        return x
      case WordKind.Norm:
        const f = this.bound.get(this.sym)
        if (f === undefined) {
          throw new Error('nothing when read ' + this.sym)
        }
        return checkReturn(f, pc)
      case WordKind.Get:
        return this.bound.get(this.sym)
      default: 
        throw new Error('not implemented')
    }
  }
}

export class Path extends CodeItem {
  private kind: WordKind
  private path: string[]
  private bound?: Bound

  constructor(kind: WordKind, path: string[]) {
    super ()
    this.kind = kind
    this.path = path
  }

  bind(f: BindFactory) {
    const bound = f(this.path[0])
    if (bound) this.bound = bound
  }

  exec (pc: PC): Promise<any> {
    if (!this.bound)
      throw new Error('path not bound')
    switch (this.kind) {
      case WordKind.Get:
        return this.path.slice(1).reduce((acc, val) => acc[val], this.bound.get(this.path[0]))
      default:
        // throw new Error('should not be here ' + this.path.toString())
        const result = this.path.slice(1).reduce((acc, val) => acc[val], this.bound.get(this.path[0]))
        return checkReturn(result, pc)
    }
  }
}

export class Brackets extends CodeItem {
  private code: Code

  constructor (code: Code) {
    super()
    this.code = code
  }

  bind(f: BindFactory) {
    bind(this.code, f)
  }

  exec (pc: PC): any {
    return pc.vm.exec(this.code)
  }
}

export class Const extends CodeItem {
  private val: any

  constructor (val: any) {
    super()
    this.val = val
  }

  bind() {}

  exec (): Promise<any> {
    return this.val
  }

}

export class Block extends CodeItem {
  private code: Code

  constructor (code: Code) {
    super()
    this.code = code
  }

  bind(f: BindFactory) {
    bind(this.code, f)
  }

  exec (pc: PC): any {
    return this.code
  }

}

export class Refinement extends CodeItem {
  readonly ident: string

  constructor (ident: string) {
    super()
    this.ident = ident
  }

  bind(f: BindFactory) {
  }

  exec (pc: PC): any {
    return this
  }

}

export function bind(code: Code, boundFactory: (sym: string) => Bound | undefined) {
  code.forEach(item => {if (!item.bind) { console.log(item); throw new Error('no bind') } else { return item.bind(boundFactory) }})
}

function getSetWords(code: Code): { [key: string]: string } {
  let result: { [key: string]: string } = {}
  code.forEach ((item: any) => {
    if (Array.isArray(item)) {
      result = { ...result, ...getSetWords(item) }
    } else if (item.kind && item.kind === WordKind.Set) {
      result[item.sym] = item.sym
    }
  })
  return result
}

export function bindDictionary(code: Code, dict: { [key: string]: any }) {
  const setWords = getSetWords(code)

  bind(code, (sym: string) => {
    if (setWords[sym]) {
      return { 
        get: (sym: string) => dict[sym],
        set: (sym: string, value: any) => dict[sym] = value
      }  
    }
  })
}

export function bindDictionaryWords(code: Code, dict: { [key: string]: any }) {
  bind(code, (sym: string) => {
    if (dict[sym]) {
      return { 
        get: (sym: string) => dict[sym],
        set: (sym: string, value: any) => dict[sym] = value
      }  
    }
  })
}

export class VM {
  dictionary: Dict = {}
  stack: any[] = []
  result: any
  // url?: URL

  bind(code: Code) {
    bind(code, () => {
      return { 
        get: (sym: string) => this.dictionary[sym],
        set: (sym: string, value: any) => this.dictionary[sym] = value
      }  
    })
  }

  exec(code: Code): any {
    try {
      return new PC(this, code).exec()
    } catch (err) {
      console.log('exec exception: ' + err)
      throw err
    }
  }

}

export class PC { 
  code: Code
  pc: number
  vm: VM

  constructor(vm: VM, code: Code) { 
    this.code = code
    this.pc = 0
    this.vm = vm
  }

  fetch(): CodeItem {
    return this.code[this.pc++]
  }

  back() { --this.pc }

  nextNoInfix(): Promise<any> {
    let result = this.fetch().exec(this)    
    if (result && typeof result === 'object' &&  typeof (result as any).resume === 'function') {
      //console.log('suspend here', result)
      const promise = (result as any).resume() as Promise<void>
      //promise.then((res: any) => { console.log('proc done, ', res)}).catch((err: any) => { console.log ('proc err', err)})
      ;(result as any).resume = promise
    }
    this.vm.result = result
    return result
  }

  next(): any {
    const result = this.nextNoInfix()
    return ((this.code[this.pc] as any)?.infix) ? this.nextNoInfix() : result
  }

  hasNext(): boolean {
    return this.pc < this.code.length
  }

  exec(): any {
    // if (trace) {
    //   console.log('exec: ', this.code)
    // }
    let result
    while (this.hasNext()) {
      result = this.next()
      // if (trace) {
      //   console.log('> ', result)
      // }
    }
    return result
  }
}

export interface Context {
  vm: VM
}

// U T I L S

export function blockOfRefinements(code: Code) {
  const result = { default: [] } as { [key: string]: CodeItem[] }
  let values = result.default
  for (let i = 0; i < code.length; i++) {
    if (code[i] instanceof Refinement) {
      const kind = (code[i] as Refinement).ident
      values = result[kind]
      if (values === undefined) {
        result[kind] = values = []
      }
    } else {
      values.push(code[i])
    }
  }
  return result
}

export async function asyncResult(result: any): Promise<any> {
  if (typeof result === 'object' && result.resume) {
    return new Promise((resolve, reject) => {
      const out: any[] = []
      result.out.subscribe({
        onNext(t: any) {
          out.push(t)
        },
        onSubscribe(s: Subscription): void {},
        onError(e: Error): void {},
        onComplete(res: any): void {
          if (out.length === 0) {
            resolve(res)
          } else if (out.length === 1) {
            resolve(out[0])
          } else {
            resolve(out)
          }
        }
      })  
    })
  } else {
    return result
  }
}
