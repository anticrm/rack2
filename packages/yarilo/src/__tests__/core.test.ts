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

import { boot } from '../boot'
import { parse } from '../parse'
import { VM, PC, Refinement } from "../vm"
import { importModule } from '../import'
import { Suspend, Subscription } from '../async'

describe('core', () => {
  it('should parse', () => {
    const x = parse('add 1 2')
    expect(x[1].val).toBe(1)
  })  

  it('should parse', () => {
    const x = parse('add "1" "2"')
    expect(x[1].val).toBe('1')
  })

  it('should parse', () => {
    const x = parse('add 1 core/data')
  })

  it('should parse', () => {
    const x = parse('fn /data')
    expect(x[1] instanceof Refinement).toBeTruthy()
    expect(x[1].ident).toBe('data')
  })

  it('should execute', () => {
    const x = parse('add 10 20')
    const vm = new VM(); boot(vm)
    vm.bind(x)
    expect(vm.exec(x)).toBe(30)
  })

  it('should execute', () => {
    const x = parse('add add 1 2 3')
    const vm = new VM(); boot(vm)
    vm.bind(x)
    expect(vm.exec(x)).toBe(6)
  })
  
})

/*




Deno.test('should execute', () => {
  const x = parse('sub 1 20')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), -19)
})

Deno.test('should execute', () => {
  const x = parse('gt 7 8 gt 8 7 eq 7 7 eq 7 8')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const ctx = new PC(vm, x)
  assertEquals(ctx.next(), false)
  assertEquals(ctx.next(), true)
  assertEquals(ctx.next(), true)
  assertEquals(ctx.next(), false)
})

Deno.test('should execute', () => {
  const x = parse('1 > 2 4 > 3 5 = 5 6 = 7')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const ctx = new PC(vm, x)
  assertEquals(ctx.next(), false)
  assertEquals(ctx.next(), true)
  assertEquals(ctx.next(), true)
  assertEquals(ctx.next(), false)
})

Deno.test('should execute', () => {
  const x = parse('1 = 20')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), false)
})

Deno.test('should execute', () => {
  const x = parse('1 = 1')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), true)
})

Deno.test('should execute', () => {
  const x = parse('1 + 1')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 2)
})

Deno.test('should execute', () => {
  const x = parse('1 + 2 * 3')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 9)
})

Deno.test('should execute', () => {
  const x = parse('1 + (2 * 3)')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 7)
})

Deno.test('should execute `x: fn [n] [add n 10] x 5`', () => {
  const x = parse('x: fn [n] [add n 10] x 5')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 15)
})

Deno.test('should execute `either gt 2 1 [5] [6]`', () => {
  const x = parse('either gt 2 1 [5] [6]')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 5)
})

Deno.test('should execute adder', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add n n] [n]] fib 10')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 20)
})

Deno.test('should execute fib #1', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add n fib sub n 1] [n]] fib 100')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 5050)
})

Deno.test('should execute', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add fib sub n 2 fib sub n 1] [n]] fib 20')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should execute', () => {
  const x = parse('fib: fn [n] [either gt n 1 [add fib sub n 2 fib sub n 1] [n]] fib 20')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should execute', () => {
  const x = parse('fib: fn [n] [either n > 1 [(fib n - 2) + (fib n - 1)] [n]] fib 20')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertEquals(vm.exec(x), 6765)
})

Deno.test('should import module', async () => {
  const vm = new VM(); boot(vm)
  const mod = await importModule(vm, 'mem', new URL('../mem/mod.y', import.meta.url))
  assertEquals(typeof mod.set, 'object')
  assertEquals(typeof mod.get, 'object')
  mod.Impl.stop()
})

// Deno.test('should import module', async () => {
//   const vm = new VM(); boot(vm)
//   const mod = await importModule(vm, 'http', new URL('../http/mod.y', import.meta.url))
//   assertEquals(typeof mod.expose, 'function')
//   mod.Impl.stop()
// })

Deno.test('should execute', () => {
  const x = parse('add 5 5 throw "message"')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  assertThrowsAsync(() => vm.exec(x))
})

Deno.test('should execute', () => {
  const x = parse('x: fn [n /extra y] [either extra [add n y] [n]] add x 10 x/extra 10 20')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const result = vm.exec(x)
  assertEquals(result, 40)
})

Deno.test('should execute', () => {
  const x = parse('x: 10 p: fn [/local x] [x: 5 x] add p x')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const result = vm.exec(x)
  assertEquals(result, 15)
})

Deno.test('should execute', () => {
  const x = parse('do [add 5 5]')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const result = vm.exec(x)
  assertEquals(result, 10)
})

Deno.test('should execute', async () => {
  const x = parse('write "7777"')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let read
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {}
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, "7777")
})

Deno.test('should execute', async () => {
  const x = parse('pipe write "7777" passthrough')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let read
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, "7777")
})

Deno.test('should execute', async () => {
  const x = parse('generate: proc [] [out 1 out 2 out 3] doubler: proc [/in /out] [out add in in] pipe generate doubler')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  const read: any[] = []
  suspend.out.subscribe({
    onNext(t: any) {
      read.push(t)
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, [2, 4, 6])
})

Deno.test('should execute', async () => {
  const x = parse('generate: proc [] [out 1 out 2 out 3] doubler: proc [/in /out] [out add in in] pipe generate doubler')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  const read: any[] = []
  suspend.out.subscribe({
    onNext(t: any) {
      read.push(t)
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, [2, 4, 6])
})

Deno.test('should execute', async () => {
  const x = parse('generate: proc [] [loop 1000 [out 8]] doubler: proc [/in /out] [out add in add in add in in] pipe generate doubler')
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let read: any
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, 32)
})


Deno.test('should execute', async () => {
  const x = parse(
    `
    user-auth: fn [auth] [
      x: split auth " "
      verify: proc [/in /out] [either in = pair/1 [out 1] [throw "key and secret does not match"]]
      either x/0 = "Basic" [
        pair: split debase x/1 ":"
        pipe write "Y" verify
      ] [
        throw "expecting Basic authorization"
      ]
    ]
    user-auth "Basic WDpZ"
    `    
  )
  const vm = new VM(); boot(vm)
  vm.bind(x)
  const suspend: Suspend = vm.exec(x)
  let read: any
  suspend.out.subscribe({
    onNext(t: any) {
      read = t
    },
    onSubscribe(s: Subscription): void {},
    onError(e: Error): void {},
    onComplete(): void {
      console.log('on complete here!')
    }
  })
  await (suspend.resume as unknown as Promise<void>)
  assertEquals(read, 1)
})

*/