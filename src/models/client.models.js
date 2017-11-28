export default (sequelize, DataTypes) => {
  const Client = sequelize.define(
    'Client',
    {
      client_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      abboWebId: {
        type: DataTypes.INTEGER
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true
        }
      }
    },
    {
      setterMethods: {
        id: function(value) {
          if (!this.isNewRecord) {
            throw new sequelize.ValidationError(null, [
              new sequelize.ValidationErrorItem(
                'readonly',
                'id may not be set',
                'id',
                value
              )
            ])
          }
        }
      }
    },
    {
      classMethods: {
        associate: function(models) {
          Adress.hasMany(models.adress, {
            foreignKey: 'adress_id',
            constraints: false
          })
        }
      },
      tableName: 'Adress'
    }
  )
  return Client
}
