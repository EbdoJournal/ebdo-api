export default function createClientStore(logger, ClientModel) {
  return {
    async getByEmail(email) {
      const client = await ClientModel.findOne({
        where: { email: email }
      })
      return client
    },

    async create(data) {
      const client = await ClientModel.build(data).save()
      return client
    },

    async update(email, data) {
      const client = await ClientModel.update(data, {
        where: { email: email },
        returning: true
      })
      return client
    }
  }
}