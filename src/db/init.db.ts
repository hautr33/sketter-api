import sequelizeConnection from './config.db'
import { ENVIRONMENT } from '../utils/secrets'

/**
 * DB Connection related actions
 */

const isDev = ENVIRONMENT === 'development'

export default {
    connect(): Promise<void> {
        return sequelizeConnection.sync({ alter: isDev })
            .then(() => {
                console.info('DB connection successful');
            })
            .catch((reason) => {
                console.error('Could not establish db connection');
                console.error(reason);
            });
    }
}