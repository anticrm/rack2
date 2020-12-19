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

import { PC, Code, Proc, VM, ProcFunctions, blockOfRefinements } from "./vm"
import coreModule from "./core"

// import asyncModule, { nativeAsync } from './async.ts'
import { parse } from "./parse"

function native(pc: PC): Proc {
  const params = pc.next() as Code
  const impl = pc.next() as { [key: string]: Function }

  const ref = blockOfRefinements(params)

  const defaults = ref.default.length
  const alternatives: string[] = []
  for (const key in ref) {
    if (key !== 'default') {
      alternatives.push(key)
      break
    }
  }

  const f = {
    __params: 5,
  }

  function create(alt: number) {
    const altStackSize = alt < 0 ? 0 : ref[alternatives[alt]].length
    const f = alt < 0 ? (typeof impl === 'function' ? impl : impl.default) : impl[alternatives[alt]]

    return (pc: PC): any => {
      //console.log('executing defaults ' + defaults + ' alts ' + altStackSize)
      const values: any[] = []
      for (let i = 0; i < defaults; i++) {
        values.push(pc.next())
      }
      for (let i = 0; i < altStackSize; i++) {
        values.push(pc.next())
      }
      return f.apply(pc, values)
  
    }
  }

  (f as unknown as ProcFunctions).default = create(-1)
  alternatives.forEach((alter, i) => {
    (f as unknown as ProcFunctions)[alter] = create(i)
  })

  return f
}

function nativeInfix(pc: PC) {
  const impl = pc.next() as Function

  const f = { 
    __params: 5,
  };

  (f as unknown as ProcFunctions).default = (pc: PC): any => {
    const values = [pc.vm.result, pc.nextNoInfix()]
    return impl.apply(pc, values)
  }

  return f
}

export function boot(vm: VM) {
  vm.dictionary['native'] = { __params: 5, default: native }
  vm.dictionary['native-infix'] = { __params: 5, default: nativeInfix }
  coreModule(vm)
}
