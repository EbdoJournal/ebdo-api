import { NotFound, BadRequest, Conflict } from 'fejl'
import { pick } from 'lodash'

const assertEmail = BadRequest.makeAssert('No email given')
const pickProps = data =>
  pick(data, ['monthly_price_ttc', 'is_gift', 'time_limited', 'duration'])

export default class OfferService {
  constructor(offerStore) {
    this.offerStore = offerStore
  }

  async findOffer(time, price, gift, duration) {
    BadRequest.assert(time, 'No time for offer payload given')
    BadRequest.assert(price, 'No price for offer payload given')
    BadRequest.assert(gift, 'No gift for offer payload given')
    const offer = {
      monthly_price_ttc: price,
      is_gift: gift,
      time_limited: time,
      duration: time === 'inf' ? 0 : time
    }
    return this.offerStore
      .getOfferFromParams(offer)
      .then(NotFound.makeAssert(`founded`))
      .catch(NotFound.makeAssert(`not found`))
  }

  async findAll() {
    return this.offerStore.getAll()
  }

  async create(body) {
    BadRequest.assert(body.offer, 'No offer payload given')
    const offer = body.offer
    BadRequest.assert(offer.email, 'email is required')

    const offerTest = await this.offerStore.getByEmail(offer.email)
    Conflict.assert(
      !offerTest,
      `Offer with email "${offer.email}" already found`
    )

    const picked = pickProps(offer)
    return this.offerStore.create(picked)
  }

  async update(id, data) {
    const offer = data.offer
    BadRequest.assert(offer, 'No offer payload given')

    await this.findById(id)

    const picked = pickProps(offer)
    return this.offerStore.update(id, picked)
  }
}
