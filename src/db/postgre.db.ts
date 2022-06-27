import { Sequelize } from 'sequelize';
import config from '../config';

/**
 * DB Connection related actions
 */
export default {
    connect(): Promise<void> {
        return new Sequelize(config.DB_URL).authenticate()
            .then(() => {
                console.info('DB connection successful');
            })
            .catch((reason) => {
                console.error('Could not establish db connection');
                console.error(reason);
            });
    }
}