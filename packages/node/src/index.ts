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

import { cpus } from 'os'
const pkg = require('../package.json')

interface NodeConfig {
  redisHost: string
  tags?: { [key: string]: string }
}

export interface Service {
  name: string
  version: string

  deploy(deployment: Deployment): Promise<void>
}

export interface Deployment {
  domain: string
}

export class Node {

  readonly config: NodeConfig
  readonly cpuCount: number
  readonly services = new Map<string, Service>()

  constructor(config: NodeConfig) {
    this.config = config
    this.cpuCount = cpus().length

    console.log(pkg.name + '/' + pkg.version + '. copyright (c) 2020 Anticrm Platform Contributors. All rights reserved.')
    console.log(' - available cpus: ' + this.cpuCount)    
  }

  registerService(service: Service) {
    console.log(' - available service: ' + service.name + '/' + service.version)
    this.services.set(service.name, service)
  }
}
