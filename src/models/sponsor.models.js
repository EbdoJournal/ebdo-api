export default (sequelize, DataTypes) => {
  const Sponsor = sequelize.define('Sponsor', {
    sponsor_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    client_sponsor_id: {
      type: DataTypes.INTEGER
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    checkout_id: {
      type: DataTypes.INTEGER
    }
  })

  return Sponsor
}
