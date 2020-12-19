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

import { Word, WordKind, Path, Brackets, VM, Const, Block, Refinement } from './vm'

const zero = '0'.charCodeAt(0)
const nine = '9'.charCodeAt(0)

function isDigit(charCode: number): boolean {
  return charCode >= zero && charCode <= nine
}

export function parse(s: string, pos: number = 0): any[] {

  function readIdent (): string {
    let ident = ''

    while (i < s.length && ' \n[](){}:;/'.indexOf(s.charAt(i)) === -1) {
      ident += s.charAt(i)
      i++
    }

    return ident
  }

  const results = []
  let result: any[] = []
  let i = pos
  while (i < s.length) {
    switch (s.charAt(i)) {
      case ' ':
      case '\n':
          i++
        break
      case ']':
        i++
        const code = result
        result = results.pop() as any[]
        result.push(new Block(code))
        break
      case '[':
        i++
        results.push(result)
        result = []
        break
      case ')':
        i++
        const braces = result
        result = results.pop() as any[]
        result.push(new Brackets(braces))
        break
      case '(':
        i++
        results.push(result)
        result = []
        break  
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        let val = 0
        while (i < s.length && isDigit(s.charCodeAt(i))) {
          val = val * 10 + s.charCodeAt(i) - zero
          i++
        }
        result.push(new Const(val))
        break
      case '"':
        let str = ""
        while (++i < s.length && s.charAt(i) !== '"')
          str += s.charAt(i) 
        result.push(new Const(str))
        i++
        break
      case '/':
        i++
        const id = readIdent()
        result.push(new Refinement(id))
        break
      default:
        let kind = WordKind.Norm
        const c = s.charAt(i)
        if (c === '\'') {
          kind = WordKind.Quote
          i++
        } else if (c === ':') {
          kind = WordKind.Get
          i++
        }

        const ident = readIdent()
    
        if (s.charAt(i) === ':') {
          kind = WordKind.Set
          i++
        }
        else if (s.charAt(i) === '/') {
          const path = []
          path.push(ident)
          i++
          while (i < s.length) {
            const ident = readIdent()
            path.push(ident)
            if (s.charAt(i) !== '/') break
            else i++
          }
          result.push(new Path(kind, path))
          break
        }

        const word = new Word(kind, ident)
        result.push(word)
        break
    }
  }
  return result
}

export function parseAndExec(vm: VM, code: string) {
  const x = parse(code)
  vm.bind(x)
  return vm.exec(x)
}
