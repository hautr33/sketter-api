import { Sequelize } from 'sequelize';
import { DB_URL } from '../config/default';

/**
 * Sequelize Connection related actions
 */

const sequelizeConnection = new Sequelize(DB_URL, {
    logging: false, dialectOptions: {
        ssl: {
            rejectUnauthorized: false
        }
    }
});

export default sequelizeConnection;