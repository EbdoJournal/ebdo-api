export default (sequelize, DataTypes) => {
  const Client = sequelize.define(
    'Client',
    {
      client_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      aboweb_client_id: {
        type: DataTypes.INTEGER,
        unique: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true
        }
      },
      type_client: {
        type: DataTypes.INTEGER
      },
      first_name: {
        type: DataTypes.STRING
      },
      last_name: {
        type: DataTypes.STRING
      },
      login_code: {
        type: DataTypes.INTEGER
      },
      login_code_created_at: {
        type: DataTypes.DATE
      },
      is_godson: {
        type: DataTypes.BOOLEAN
      },
      id_client_god_father: {
        type: DataTypes.BOOLEAN
      }
    },
    {
      indexes: [
        {
          unique: true,
          fields: ['email']
        },
        {
          unique: true,
          fields: ['aboweb_client_id']
        }
      ]
    }
  )

  Client.associate = models => {
    Client.hasMany(models.Address, {
      targetKey: 'address_id',
      foreignKey: 'client_id'
    })
    Client.hasMany(models.Checkout, {
      targetKey: 'checkout_id',
      foreignKey: 'client_id'
    })
    Client.hasMany(models.Token, {
      targetKey: 'token_id',
      foreignKey: 'client_id'
    })
    Client.hasMany(models.Subscription, {
      targetKey: 'aboweb_client_id',
      foreignKey: 'aboweb_client_id',
      constraints: false
    })
  }

  return Client
}
