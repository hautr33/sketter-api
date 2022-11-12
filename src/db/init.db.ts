import sequelizeConnection from './sequelize.db'
// import { ENVIRONMENT } from '../config/default'
import logger from '../utils/logger'
import { City } from '../models/city.model';
import { TimeFrame } from '../models/time_frame.model';

/**
 * DB Connection related actions
 */

// const isDev = ENVIRONMENT === 'development'

export default {
    connect(): Promise<void> {
        return sequelizeConnection.sync({ alter: true, logging: false })
            .then(async () => {
                logger.info('DB connection successful')

                //Init city
                const city = [
                    [1, 'Đà Lạt']
                ]
                for (let i = 0; i < city.length; i++) {
                    await City.upsert({ id: city[i][0] as number, name: city[i][1] as string })
                }

                //Init timeframe
                for (let i = 1; i <= 12; i++) {
                    const id = i
                    const from = (i - 1) * 2 >= 10 ? (i - 1) * 2 + ':00' : '0' + (i - 1) * 2 + ':00'
                    const to = i * 2 >= 10 ? i * 2 + ':00' : '0' + i * 2 + ':00'
                    await TimeFrame.upsert({ id: id, from: from, to: to })
                }
            })
            .catch((e) => {
                logger.error('Could not establish db connection\n', e);
                process.exit(1);
            });
    }
}
