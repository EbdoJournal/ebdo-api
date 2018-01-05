import { NotFound, BadRequest, Conflict, PaymentError } from 'fejl'
import _ from 'lodash'
import newClientProducer from '../producers/newClientProducer'
import newAddressProducer from '../producers/newAddressProducer'
import newSubscriptionDDCB from '../producers/newSubscriptionDDCB'
import newSubscriptionADLCB from '../producers/newSubscriptionADLCB'
import newSubscriptionADLSEPA from '../producers/newSubscriptionADLSEPA'
import stripe from '../lib/stripe'

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
    offerStore,
    chargeStore
  ) {
    this.clientStore = clientStore
    this.addressStore = addressStore
    this.tokenStore = tokenStore
    this.offerStore = offerStore
    this.checkoutStore = checkoutStore
    this.chargeStore = chargeStore
  }

  async findById(id) {
    BadRequest.assert(id, 'No id payload given')

    const checkout = await this.checkoutStore.getById(id)
    NotFound.assert(checkout, `Checkout with id "${id}" not found`)

    return { checkout }
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

    const addressInvoice = await this.addressStore.getByIdAndClientId(
      pickedCheckout.address_invoice_id,
      pickedCheckout.client_id
    )
    NotFound.assert(
      addressInvoice,
      `Checkout with address invoice "${
        pickedCheckout.address_invoice_id
      }" not found`
    )

    const addressDelivery = await this.addressStore.getByIdAndClientId(
      pickedCheckout.address_delivery_id,
      pickedCheckout.client_id
    )
    NotFound.assert(
      addressDelivery,
      `Checkout with address delivery "${
        pickedCheckout.address_delivery_id
      }" not found`
    )

    const useSameAddressDelivery =
      addressDelivery.address_equal && addressInvoice.address_equal

    if (!useSameAddressDelivery) {
      const producerAddressDelivery = await newAddressProducer({
        client: client,
        addressDelivery
      })
    }

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
    checkoutStored.setDelivery_address(addressDelivery)
    checkoutStored.setInvoice_address(addressInvoice)
    checkoutStored.status = 'created'

    // OFFRE À Durée Déterminée && Stripe CB Payment
    if (offer.time_limited && offer.payment_method === 2) {
      try {
        const chargeStripe = await this.chargeCard(
          token,
          offer,
          checkoutStored,
          client
        )

        checkoutStored.status = 'paid'

        const producer = await newSubscriptionDDCB({
          offer: offer,
          checkout: checkoutStored,
          client: client,
          isDiffAddress: !useSameAddressDelivery
        })
      } catch (err) {
        checkoutStored.status = 'declined'
        PaymentError.assert(!err, err.message)
      }
    }

    // OFFRE À Durée Libre && Stripe CB Token
    if (!offer.time_limited && offer.payment_method === 2) {
      try {
        const producer = await newSubscriptionADLCB({
          offer: offer,
          checkout: checkoutStored,
          client: client,
          token: token,
          isDiffAddress: !useSameAddressDelivery
        })
        checkoutStored.status = 'finished'
      } catch (err) {
        checkoutStored.status = 'finished/aboweb-error'
        PaymentError.assert(!err, err.message)
      }
    }

    // OFFRE À Durée Libre && SLIMPAY token
    if (!offer.time_limited && offer.payment_method === 1) {
      try {
        const producer = await newSubscriptionADLSEPA({
          offer: offer,
          checkout: checkoutStored,
          client: client,
          token: token,
          isDiffAddress: !useSameAddressDelivery
        })
        checkoutStored.status = 'finished'
      } catch (err) {
        checkoutStored.status = 'finished/aboweb-error'
        PaymentError.assert(!err, err.message)
      }
    }

    const checkoutreturn = await checkoutStored.save()
    return { checkout: checkoutreturn }
  }

  async chargeCard(token, offer, checkout, client) {
    const stripeCharge = await stripe.charges.create({
      amount: this.calculAmount(offer),
      currency: 'eur',
      description: offer.description,
      customer: token.stripe_customer_id,
      metadata: { order_id: checkout.checkout_id }
    })

    const chargeStored = await this.chargeStore.create({
      stripe_charge_return: stripeCharge
    })
    chargeStored.setToken(token)
    chargeStored.setClient(client)
    chargeStored.setCheckout(checkout)

    return stripeCharge
  }

  calculAmount(offer) {
    return offer.price_ttc
  }

  async updateAboweb(id, data) {
    BadRequest.assert(id, 'No id checkout payload given')

    const pickedCheckout = _.pick(data.checkout, ['aboweb_subscribe_id'])
    BadRequest.assert(pickedCheckout, 'No checkout payload given')
    BadRequest.assert(
      pickedCheckout.aboweb_subscribe_id,
      'No aboweb payload given'
    )

    const checkoutObject = await this.findById(id)

    const offer = await this.offerStore.getById(
      checkoutObject.checkout.offer_id
    )
    NotFound.assert(offer, `Offer with "${JSON.stringify(offer)}" not found`)
    if (offer.time_limited && offer.payment_method === 2) {
      pickedCheckout.status = 'paid/aboweb-transfered'
    } else {
      pickedCheckout.status = 'finished/aboweb-transfered'
    }

    return this.checkoutStore
      .update(id, pickedCheckout)
      .then(res => ({ updated: true, checkout: res[1][0] }))
      .catch(err =>
        Conflict.assert(
          err,
          `Checkout with id "${err.errors[0].message}" is unavailable to update`
        )
      )
  }
}
