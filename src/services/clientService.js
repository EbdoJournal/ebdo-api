import { NotFound, BadRequest, Conflict } from 'fejl'
import _ from 'lodash'

const assertEmail = BadRequest.makeAssert('No email given')
const pickProps = data =>
  _.pick(data, [
    'email',
    'name',
    'type_client',
    'aboweb_client_id',
    'first_name',
    'last_name',
    'is_godson',
    'id_client_god_father'
  ])

export default class ClientService {
  constructor(clientStore) {
    this.clientStore = clientStore
  }

  async countClient() {
    const count = this.clientStore.count()
    return count
  }

  async findByEmail(email) {
    assertEmail(email)
    const pickedEmail = _.toLower(email.trim())

    const client = await this.clientStore.getByEmail(pickedEmail)
    NotFound.assert(client, `Client with email "${pickedEmail}" not found`)

    return { client }
  }

  async findById(id) {
    BadRequest.assert(id, 'No id payload given')

    const client = await this.clientStore.getById(id)
    NotFound.assert(client, `Client with id "${id}" not found`)

    return { client }
  }

  async create(body) {
    BadRequest.assert(body.client, 'No client payload given')
    const pickedClient = pickProps(body.client)
    pickedClient.email = _.toLower(pickedClient.email.trim())
    BadRequest.assert(pickedClient.email, 'email is required')

    const clientTest = await this.clientStore.getByEmail(pickedClient.email)
    Conflict.assert(
      !clientTest,
      `Client with email "${pickedClient.email}" already found`
    )

    pickedClient.type_client = 0
    const clientStored = await this.clientStore.create(pickedClient)

    return { client: clientStored }
  }

  async updateAboweb(id, data) {
    BadRequest.assert(id, 'No id client payload given')

    const pickedClient = pickProps(data.client)
    BadRequest.assert(pickedClient, 'No client payload given')

    await this.findById(id)

    return this.clientStore
      .update(id, pickedClient)
      .then(res => ({ updated: true, client: res[1][0] }))
      .catch(err =>
        Conflict.assert(
          err,
          `Client with id "${err.errors[0].message}" already found`
        )
      )
  }
}
