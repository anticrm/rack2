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

import { VM, Context, Code, Proc, CodeItem, Word, Bound, bind, blockOfRefinements, PC, Refinement, ProcFunctions } from './vm'
import { parse } from './parse'
import { Publisher, Subscription, Suspend, Subscriber } from './async'

// import { Base64 } from "https://deno.land/x/bb64/mod.ts"

function createProc(_default: (pc: PC) => any): Proc & ProcFunctions {
  return { __params: 5, default: _default} as unknown as Proc & ProcFunctions
}

function createModule() {
  return { 
    add (x: number, y: number): number {
      // console.log('add ', x, y)
      return x + y
    },

    sub (x: any, y: any): number {
      //console.log('sub ', x, y)
      return x - y
    },
    
    mul (x: any, y: any): number {
      return x * y
    },
    
    gt (x: any, y: any): boolean {
      return x > y
    },
    
    eq (x: any, y: any): boolean {
      return x === y
    },

    either(this: Context, cond: any, ifTrue: Code, ifFalse: Code): any {
      return this.vm.exec(cond ? ifTrue : ifFalse)
    },

    loop(this: Context, times: number, code: Code): any {
      let result
      for (let i = 0; i < times; i++) 
        result = this.vm.exec(code)
      return result
    },

    do(this: Context, code: any): any {
      if (Array.isArray(code)) {
        // assume code block
        return this.vm.exec(code)
      } else if (typeof code === 'string') {
        const x = parse(code)
        this.vm.bind(x)
        return this.vm.exec(x)
      }
    },
    
    proc (this: Context, params: Code, code: Code): Proc {

      const offsets: { [key: string]: number } = {}

      // count stack parameters
      let stackParams = 0
      let stackSize = 0
      let kind = 'default'

      let pos = 0

      let input: boolean = false
      let output: boolean = false

      for (let i = 0; i < params.length; i++) {
        if (params[i] instanceof Refinement) {
          kind = (params[i] as Refinement).ident
          if (kind === 'in') {
            input = true
          } else if (kind === 'out') {
            output = true
          }
        } else switch (kind) {
          case 'default':
            stackParams++
          case 'local':
            stackSize++
            const word = params[i] as Word
            offsets[word.sym] = pos++
            break
          default: 
            throw new Error('unknown kind')
        }
      }

      const vm = this.vm

      const f = { 
        __params: 5,
      };

      (f as unknown as ProcFunctions).default = (pc: PC): any => {
        const stack: any[] = Array(stackSize)
        for (let i = 0; i < stackParams; i++) {
          stack[i] = pc.next()
        }
        const _in = new Publisher()
        const out = new Publisher()
        let inputValueHolder: any
        bind(code, (sym: string): Bound | undefined => {
          if (sym === 'in') {
            return {
              get: (sym: string): any => inputValueHolder,
              set: (sym: string, value: any) => { throw new Error('in is read only') }
            }                
          }
          if (sym === 'out') {
            return {
              get: (sym: string): any => createProc((pc: PC): any => out.write(pc.next())),
              set: (sym: string, value: any) => { throw new Error('out is read only') }
            }
          }
          if (sym === 'done') {
            return {
              get: (sym: string): any => createProc((pc: PC): any => out.done(pc.next())),
              set: (sym: string, value: any) => { throw new Error('done is read only') }
            }
          }
          if (offsets[sym] !== undefined) {
            return {
              get: (sym: string): any => stack[offsets[sym]],
              set: (sym: string, value: any) => stack[offsets[sym]] = value
            }
          }
        })
        return {
          resume: async (): Promise<void> => {
            if (!input) {
              const result = vm.exec(code)
              out.done(result)
              return result
            } else {
              return new Promise((resolve, reject) => {
                _in.subscribe({
                  onSubscribe(s: Subscription): void {},
                  onNext(t: any): void {
                    inputValueHolder = t
                    vm.exec(code)
                  },
                  onError(e: Error): void {},
                  onComplete(res: any): void { resolve(res) },          
                })
              })
            }
          },
          out,
          in: _in,
        }  
      }

      return f
    },
    
    fn (this: Context, params: Code, code: Code): Proc {


      const ref = blockOfRefinements(params)
      if (ref.local === undefined) {
        ref.local = []
      }

      const defaults = ref.default.length
      const locals = ref.local.length
      const alternatives: string[] = []
      for (const key in ref) {
        if (key !== 'default' && key !== 'local') {
          alternatives.push(key)
          break
        }
      }

      const stackSize = defaults + locals + alternatives.length
      const offsets: { [key: string]: number } = {}
      ref.default.forEach((val, i) => { offsets[(val as Word).sym] = i - stackSize })
      ref.local.forEach((val, i) => { offsets[(val as Word).sym] = i + defaults - stackSize })
      alternatives.forEach((alter, i) => {
        offsets[alter] = i + defaults + locals - stackSize
        ref[alter].forEach((val, i) => { offsets[(val as Word).sym] = i - stackSize - ref[alter].length })
      })

      const vm = this.vm

      bind(code, (sym: string): Bound | undefined => {
        if (offsets[sym]) {
          return { 
            get: (sym: string): any => vm.stack[vm.stack.length + offsets[sym]],
            set: (sym: string, value: any) => vm.stack[vm.stack.length + offsets[sym]] = value
          } 
        }
      })

      const f = {
        __params: 5,
      }

      function create(alt: number) {
        const altStackSize = alt < 0 ? 0 : ref[alternatives[alt]].length;
        const altFlags: boolean[] = []
        for (let i = 0; i < alternatives.length; i++) {
          altFlags.push(i === alt)
        }

        return (pc: PC): any => {

          const altBase = vm.stack.length
          const base = altBase + altStackSize

          let pos = base
          for (let i = 0; i < defaults; i++) {
            vm.stack[pos++] = pc.next()
          }
          for (let i = 0; i < locals; i++) {
            vm.stack[pos++] = undefined
          }
          for (let i = 0; i < alternatives.length; i++) {
            vm.stack[pos++] = altFlags[i]
          }
          for (let i = 0; i < altStackSize; i++) {
            vm.stack[altBase + i] = pc.next()
          }

          const x = vm.exec(code)
          vm.stack.length = altBase
          return x
        }
      }

      (f as unknown as ProcFunctions).default = create(-1)
      alternatives.forEach((alter, i) => {
        (f as unknown as ProcFunctions)[alter] = create(i)
      })

      return f
    },

    pipe(this: Context, left: Suspend, right: Suspend): Suspend {
      // console.log('LEFT', left)
      // console.log('RIGHT', right)
      if (right.in === undefined)
        throw new Error('no input on the right side')
      left.out.subscribe({
        onSubscribe(s: Subscription): void {},
        onNext(t: any): void {
          (right.in as Publisher<any>).write(t ?? null)
        },
        onError(e: Error): void {},
        onComplete(res: any): void {
          (right.in as Publisher<any>).done(res)
        },
      })
    
      return {
        resume: async () => Promise.all([left.resume, right.resume]) as unknown as Promise<void>,
        out: right.out,
        in: left.in
      }  
    },

    // async importJsModule (this: Context, url: string): Promise<any> {
    //   const u = new URL(url, this.vm.url)
    //   const mod = await import(u.toString())
    //   if (mod['run']) {
    //     mod.run(this.vm)
    //   }
    //   return mod
    // },

    // async module (this: Context, desc: Code, code: Code): Promise<any> {
    //   //this.vm.bind(code)  
    //   const dict = {}
    //   bindDictionary(code, dict)
    //   await this.vm.exec(code)
    //   return dict
    // },

    throw (this: Context, message: string): Promise<any> {
      throw new Error(message)
    },
    
    print(this: Context, message: string) {
      console.log('PRINT', message)
    },

    split(this: Context, str: string, delim: string) {
      return str.split(delim)
    },

    // base(this: Context, str: string) {
    //   return Base64.fromString(str).toString()
    // },

    // debase(this: Context, str: string) {
    //   return Base64.fromBase64String(str).toString()
    // }

  }
}

const coreY = `
add: native [x y] :core/add
sub: native [x y] :core/sub
mul: native [x y] :core/mul

gt: native [x y] :core/gt
eq: native [x y] :core/eq

+: native-infix :core/add
-: native-infix :core/sub
*: native-infix :core/mul
=: native-infix :core/eq
>: native-infix :core/gt
|: native-infix :core/pipe

fn: native [params code] :core/fn
proc: native [params code] :core/proc

either: native [cond ifTrue ifFalse] :core/either
loop: native [times code] :core/loop
do: native [code] :core/do

throw: native [message] :core/throw
print: native [message] :core/print

pipe: native [left right] :core/pipe
write: proc [value /out] [out value]
passthrough: proc [/in /out] [out in]

split: native [string delim] :core/split
`
// base: native [string] :core/base
// debase: native [string] :core/debase
// `

export default function (vm: VM) {
  vm.dictionary['core'] = createModule()
  const bootCode = parse(coreY)
  vm.bind(bootCode)
  vm.exec(bootCode)
}
