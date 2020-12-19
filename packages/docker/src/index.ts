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

import Docker from 'dockerode'

const docker = new Docker()

docker.createContainer({
  Image: 'node',
  Cmd: ['xxxy'],
  AttachStdin: false,
  AttachStdout: false,
  AttachStderr: false,
  Tty: false,
  OpenStdin: false,
  StdinOnce: false,
}).then((container) => {
  container.start().then(x => {
    console.log('started', x.toString())
    container.inspect().then(i => {console.log('inspect', i)})
    const y = container.wait()
    y.then(x => {
      console.log(x)
    })
  })
}).catch(console.error)