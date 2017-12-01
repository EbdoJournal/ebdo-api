import { makeClassInvoker } from 'awilix-koa'
import Paginator from 'paginator'
import _ from 'lodash'

class ClientAPI {
  constructor({ clientService }) {
    this.clientService = clientService
  }

  async create(ctx) {
    const body = await this.clientService.create(ctx.request.body.client)
    ctx.status = 201
    ctx.ok(body)
  }

  async update(ctx) {
    const body = await this.clientService.update(
      ctx.params.id,
      ctx.request.body.client
    )
    ctx.ok(body)
  }
}

export default function(router) {
  const api = makeClassInvoker(ClientAPI)

  router
    .get('/clients', api('getAll'))
    .get('/clients/:id', api('getById'))
    .post('/clients', api('create'))
    .put('/clients/:id', api('update'))
}
