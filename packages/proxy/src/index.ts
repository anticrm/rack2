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

import { Deployment, Service } from '@anticrm/node'
import { createProxyServer } from 'http-proxy'
import { join } from 'path'

const pkg = require('../package.json')
const Greenlock = require('greenlock')

export default (): Service => {

  const packageRoot = join(__dirname, '..')
  console.log(packageRoot)

  const greenlock = Greenlock.create({
    configDir: './greenlock.d',
    packageAgent: pkg.name + '/' + pkg.version,
    maintainerEmail: "andrey.v.platov@gmail.com",
    packageRoot,
    staging: true,
    notify: function (event: any, details: any) {
      if ('error' === event) {
        // `details` is an error object in this case
        console.error(details)
      }
    }
  })
  
  greenlock.manager
    .defaults({
      agreeToTerms: true,
      subscriberEmail: 'andrey.v.platov@gmail.com'
    })
    .then(function (fullConfig: any) {
      console.log('config', fullConfig)
    })

  greenlock.add({
    subject: 'api.screenversation.com',
    altnames: ['api.screenversation.com']
  });

  const redir = require('redirect-https')()
  require('http').createServer(greenlock.middleware(redir)).listen(80);
   
  require('https').createServer(greenlock.tlsOptions, function (req: any, res: any) {
    res.end('rack proxy alive');
  }).listen(443);  

  return {
    name: pkg.name,
    version: pkg.version,
  
    async deploy(deployment: Deployment) {
    }
  }

}
