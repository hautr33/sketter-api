import { Sequelize } from 'sequelize';
import { DB_URL, ENVIRONMENT } from '../config/default';

/**
 * Sequelize Connection related actions
 */
const isDev = ENVIRONMENT === 'development'
const sequelizeConnection = isDev ? new Sequelize(DB_URL, { logging: false })
    : new Sequelize(DB_URL, { logging: false, dialectOptions: { ssl: { rejectUnauthorized: false } } })

export default sequelizeConnection;