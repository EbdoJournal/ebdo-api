import { NotFound, BadRequest, Conflict } from 'fejl'
import _ from 'lodash'
import newSubscriptionProducer from '../producers/newSubscriptionProducer'

const assertEmail = BadRequest.makeAssert('No email given')
const pickProps = data =>
  _.pick(data, [
    'client_id',
    'address_delivery_id',
    'address_invoice_id',
    'token_id',
    'offer_id',
    'payment_method',
    'is_gift',
    'cgv_accepted',
    'source'
  ])

export default class CheckoutService {
  constructor(
    checkoutStore,
    clientStore,
    addressStore,
    tokenStore,
    offerStore
  ) {
    this.clientStore = clientStore
    this.addressStore = addressStore
    this.tokenStore = tokenStore
    this.offerStore = offerStore
    this.checkoutStore = checkoutStore
  }

  async create(body) {
    BadRequest.assert(body.checkout, 'No checkout payload given')
    const pickedCheckout = pickProps(body.checkout)
    BadRequest.assert(pickedCheckout.client_id, 'client_id is required')
    BadRequest.assert(
      pickedCheckout.address_invoice_id,
      'address_invoice_id is required'
    )
    BadRequest.assert(
      pickedCheckout.address_delivery_id,
      'address_delivery_id is required'
    )
    BadRequest.assert(pickedCheckout.token_id, 'token_id is required')
    BadRequest.assert(pickedCheckout.offer_id, 'offer_id is required')

    const client = await this.clientStore.getById(pickedCheckout.client_id)
    NotFound.assert(
      client,
      `Checkout with client "${pickedCheckout.client_id}" not found`
    )

    const adressInvoice = await this.addressStore.getByIdAndClientId(
      pickedCheckout.address_invoice_id,
      pickedCheckout.client_id
    )
    NotFound.assert(
      adressInvoice,
      `Checkout with adress invoice "${
        pickedCheckout.address_invoice_id
      }" not found`
    )

    const adressDelivery = await this.addressStore.getByIdAndClientId(
      pickedCheckout.address_delivery_id,
      pickedCheckout.client_id
    )
    NotFound.assert(
      adressDelivery,
      `Checkout with adress delivery "${
        pickedCheckout.address_delivery_id
      }" not found`
    )

    const token = await this.tokenStore.getByIdAndClientId(
      pickedCheckout.token_id,
      pickedCheckout.client_id
    )
    NotFound.assert(
      token,
      `Checkout with token "${pickedCheckout.token_id}" not found`
    )

    const offer = await this.offerStore.getById(pickedCheckout.offer_id)
    NotFound.assert(
      offer,
      `Checkout with offer "${pickedCheckout.offer_id}" not found`
    )

    const checkoutStored = await this.checkoutStore.create(pickedCheckout)
    checkoutStored.setClient(client)
    checkoutStored.setOffer(offer)
    checkoutStored.setToken(token)
    checkoutStored.setDelivery_address(adressDelivery)
    checkoutStored.setInvoice_address(adressInvoice)

    return checkoutStored
  }

  async makeStripeCharge() {}
}