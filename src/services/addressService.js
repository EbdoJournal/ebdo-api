import { NotFound, BadRequest, Conflict, NotAuthenticated } from 'fejl'
import _ from 'lodash'
import newClientProducer from '../producers/newClientProducer'

const assertId = BadRequest.makeAssert('No id given')
const pickProps = data =>
  _.pick(data, [
    'last_name',
    'first_name',
    'postal_code',
    'city',
    'address_pre',
    'address',
    'address_post',
    'civility',
    'country',
    'phone',
    'type_address',
    'company',
    'address_equal'
  ])

export default class AddressService {
  constructor(addressStore, clientStore) {
    this.addressStore = addressStore
    this.clientStore = clientStore
  }

  async findByAddressTypeAndClientId(addressType, id) {
    const addressTypeString = addressType.toString()
    const clientId = parseInt(id)
    BadRequest.assert(Number.isInteger(clientId), 'id client must be a number')
    BadRequest.assert(addressTypeString, 'type address is undefined')

    const addressGet = this.addressStore.getByTypeAndClientId(
      addressTypeString,
      clientId
    )
    NotFound.assert(addressGet, `Address with id "${id}" not found`)

    return addressGet
  }

  async findById(id) {
    assertId(id)
    const idParsed = parseInt(id)
    BadRequest.assert(Number.isInteger(idParsed), 'id must be a number')

    const address = this.addressStore.getById(idParsed)
    NotFound.assert(address, `Address with id "${id}" not found`)

    return address
  }

  async create(body) {
    BadRequest.assert(body.address, 'No address payload given')
    const address = body.address
    const client = body.client
    BadRequest.assert(address.address, 'address is required')
    BadRequest.assert(address.city, 'city is required')
    BadRequest.assert(address.postal_code, 'Postal Code is required')
    BadRequest.assert(address.first_name, 'First Name is required')
    BadRequest.assert(address.last_name, 'Last Name is required')
    BadRequest.assert(address.country, 'Country is required')
    BadRequest.assert(client.client_id, 'Client id is required')

    const clientStored = await this.clientStore.getById(client.client_id)
    NotFound.assert(clientStored, `client "${client.client_id}" not found`)

    const pickedAddress = pickProps(address)
    pickedAddress.client_id = clientStored.client_id
    const addressStored = await this.addressStore.create(pickedAddress)

    //SEND ABOWEB client info
    if (addressStored.type_address === 'invoice') {
      clientStored.first_name = addressStored.first_name
      clientStored.last_name = addressStored.last_name

      const producer = await newClientProducer({
        client: clientStored,
        addressInvoice: addressStored
      })
    }
    const clientUpdated = await clientStored.save()

    return { address: addressStored, client: clientUpdated }
  }

  async update(id, data, clientLoggedId) {
    assertId(id)

    const address = data.address
    BadRequest.assert(address, 'No address payload given')

    const addressStored = await this.findById(id)

    NotAuthenticated.assert(
      addressStored.client_id === clientLoggedId,
      "You can't change an address that does not belong to you"
    )

    const picked = pickProps(address)

    let addressUpdated = await this.addressStore.update(id, picked)

    addressUpdated = addressUpdated[1][0]

    //SEND ABOWEB client info
    if (addressUpdated.type_address === 'invoice') {
      const clientStored = await this.clientStore.getById(
        addressUpdated.client_id
      )
      NotFound.assert(
        clientStored,
        `Checkout with client "${addressUpdated.client_id}" not found`
      )
      clientStored.first_name = addressUpdated.first_name
      clientStored.last_name = addressUpdated.last_name
      const clientUpdated = await clientStored.save()

      const producer = await newClientProducer({
        client: clientUpdated,
        addressInvoice: addressUpdated
      })
      return { updated: true, address: addressUpdated, client: clientUpdated }
    }

    return { updated: true, address: addressUpdated }
  }

  async updateAboweb(id, data) {
    BadRequest.assert(id, 'No id address payload given')

    const pickedAddress = _.pick(data.address, ['aboweb_address_id'])
    BadRequest.assert(
      pickedAddress.aboweb_address_id,
      'No aboweb id payload given'
    )

    const addressObject = await this.findById(id)

    return this.addressStore
      .update(id, pickedAddress)
      .then(res => ({ updated: true, address: res[1][0] }))
      .catch(err =>
        Conflict.assert(
          err,
          `Address "${err.errors[0].message}" is unavailable to update`
        )
      )
  }
}
