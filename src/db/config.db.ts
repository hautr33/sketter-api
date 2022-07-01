import { Sequelize } from 'sequelize';
import { POSTGRES_URI } from '../utils/secrets';

/**
 * Sequelize Connection related actions
 */

const sequelizeConnection = new Sequelize(POSTGRES_URI);

export default sequelizeConnection;