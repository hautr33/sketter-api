import sequelizeConnection from './sequelize.db'
import { ENVIRONMENT } from '../config/default'
import logger from '../utils/logger'

/**
 * DB Connection related actions
 */

const isDev = ENVIRONMENT === 'development'

export default {
    connect(): Promise<void> {
        return sequelizeConnection.sync({ alter: isDev, logging: false })
            .then(() => {
                logger.info('DB connection successful')
            })
            .catch((e) => {
                logger.error('Could not establish db connection', e);
                process.exit(1);
            });
    }
}
