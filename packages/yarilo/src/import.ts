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

import { VM, bindDictionary, bindDictionaryWords } from './vm'
import { parse } from './parse'

export async function importModule(vm: VM, id: string, url: URL): Promise<any> {
  console.log('loading module ' + url.toString() + '...')
  // vm.url = url
  let text: string
  if (url.protocol === 'file:') {
    const buf = await Deno.readFile(url)
    text = new TextDecoder().decode(buf)
  } else if (url.protocol.startsWith('http')) {
    console.log('url', url)
    text = await (await fetch(url.toString())).text()
    console.log('text', text)
  } else {
    throw new Error('unsupported protocol: ' + url.protocol)
  }
  const code = parse(text)
  if (code.length !== 3) {
    throw new Error('module must be `module [] []`')
  }
  vm.bind(code)

  const meta = {} as { [key: string]: any}
  const dict = {} as { [key: string]: any}
  bindDictionary(code[1].code, meta)
  vm.exec(code[1].code)

  const req = meta['Require']
  if (req) {
    const dict = {} as { [key: string]: any }
    bindDictionary(req, dict)
    vm.exec(req)
    const u = new URL('..', url)
    for (const key in dict) {
      await importModule(vm, key, new URL(dict[key], u))
    }
  }

  const implTS = meta['Impl-TypeScript']
  if (implTS) {
    const mod = await import(new URL(implTS, url).toString())
    const start = mod.default
    if (!start) {
      console.log('no run method, module: ' + url.toString())
    } else {
      const impl = await start(vm)
      dict.Impl = impl
      // modules.set(id, impl)
      if (impl.run) {
        console.log('run module: ' + url.toString())
        impl.run().then((res: any) => console.log('run exit', res)).catch((err: any) => console.log('run error', err))
      }
    }
    bindDictionaryWords(code[2].code, dict)
  } else {
    console.log('no implementation')
  }

  bindDictionary(code[2].code, dict)
  vm.exec(code[2].code)
  vm.dictionary[id] = dict
  return dict
}

// export function stopModule(id: string) {
//   const mod = modules.get(id)
//   if (mod) {
//     mod.stop()
//   } else
//     throw new Error('Module not found')
// }
