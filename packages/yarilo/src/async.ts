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

export class Publisher<T> {
  private subscriber?: Subscriber<T>
  private queue: any[] = []
  private close = false
  private completeResult: any

  subscribe(s: Subscriber<T>): void {
    this.subscriber = s
    // console.log('flushing ' + this.queue.length + ' elements')
    this.queue.forEach(item => s.onNext(item))
    this.queue = []
    if (this.close) {
      this.subscriber.onComplete(this.completeResult)
    }
  }

  write(val: T) {
    if (!this.subscriber)
      this.queue.push(val)
    else
      this.subscriber.onNext(val)
  }

  done (res: any) {
    if (this.subscriber) {
      this.subscriber.onComplete(res)
    } else {
      this.close = true
      this.completeResult = res
    }
  }
}

export interface Subscriber<T> {
  onSubscribe(s: Subscription): void
  onNext(t: T): void 
  onError(e: Error): void 
  onComplete(result: any): void
}

export interface Subscription {
  request(n: number): void;
  cancel(): void;
}

export type Suspend = { 
  resume: (input?: Publisher<any>) => Promise<void>
  out: Publisher<any>,
  in?: Publisher<any>
}
