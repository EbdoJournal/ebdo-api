export default (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    subscription_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    client_id: {
      type: DataTypes.INTEGER
    },
    aboweb_id: {
      type: DataTypes.INTEGER
    },
    checkout_id: {
      type: DataTypes.INTEGER
    },
    offer_id: {
      type: DataTypes.INTEGER
    },
    token_id: {
      type: DataTypes.INTEGER
    },
    adress_delivery_id: {
      type: DataTypes.INTEGER
    },
    adress_invoice_id: {
      type: DataTypes.INTEGER
    },
    voucher_id: {
      type: DataTypes.INTEGER
    },
    duration: {
      type: DataTypes.INTEGER
    }
  })

  Subscription.associate = models => {
    Subscription.hasOne(models.Adress, {
      foreignKey: 'fk_adress_sub',
      targetKey: 'adress_id'
    })
  }

  return Subscription
}
