import { RequestHandler } from 'express';
import { createClient } from 'redis';
import { REDIS_CONNECT_HOST, REDIS_CONNECT_PORT, REDIS_TIMEOUT_SECONDS } from '../config/default';
import AppError from '../utils/appError';
import { respondJSON } from './global.middleware';

if (!REDIS_CONNECT_HOST) throw new Error('No Redis connection found');

const redisClient = createClient({
	host: REDIS_CONNECT_HOST,
	port: parseInt(REDIS_CONNECT_PORT, 10)
});

/**
 *	This function is used for cachhing
 */
export const redisSave = (isGeneral: boolean): RequestHandler => {
	return (req, res, next) => {
		let redisKey = '';
		if (!isGeneral)
			redisKey =
				((req.headers['x-forwarded-for'] as string) ||
					req.socket.remoteAddress) + req.originalUrl;
		else redisKey = `travels-general-${req.originalUrl}`;
		redisClient.setex(
			redisKey,
			REDIS_TIMEOUT_SECONDS,
			JSON.stringify(res.resDocument),
			() => {
				next();
			}
		);
	};
};

/**
 *	This function is used for cachhing
 *
 * @param {} isGeneral
 */
export const redisGet = (isGeneral: boolean): RequestHandler => {
	return (req, res, next) => {
		let redisKey = '';
		if (!isGeneral)
			redisKey =
				((req.headers['x-forwarded-for'] as string) ||
					req.socket.remoteAddress) + req.originalUrl;
		else redisKey = `travels-general-${req.originalUrl}`;
		redisClient.get(redisKey, (err, result) => {
			if (err) {
				return next(new AppError(err.message, 500));
			}
			if (result) {
				const redisResult = JSON.parse(result);
				res.resDocument = redisResult;
				respondJSON(req, res, next);
			} else {
				next();
			}
		});
	};
};