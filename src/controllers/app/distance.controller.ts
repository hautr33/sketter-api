import catch_async from "../../utils/catch_async";
import RESDocument from "../factory/res_document";
import { StatusCodes } from "http-status-codes";
import { Distance } from "../../models/distance.model";
import axios from "axios";
import { Destination } from "../../models/destination.model";
import AppError from "../../utils/app_error";
import { MAPBOX_TOKEN } from "../../config/default";
import sequelizeConnection from "../../db/sequelize.db";

/**
 * This controller is getAllCities that get all cities
 *
 */
export const getDistance = catch_async(async (req, res, next) => {
    const { fromDestination, toDestination } = req.body;
    const profile = ['driving', 'walking', 'cycling'].includes(req.body.profile) ? req.body.profile : 'driving'

    if (fromDestination === toDestination)
        return next(new AppError('Địa điểm bắt đầu và địa địa điểm đến phải khác nhau', StatusCodes.BAD_GATEWAY))

    const from = await Destination.findOne({ where: { id: fromDestination }, attributes: ['longitude', 'latitude'] })
    const to = await Destination.findOne({ where: { id: toDestination }, attributes: ['longitude', 'latitude'] })
    if (!from || !to)
        return next(new AppError('Địa điểm không hợp lệ', StatusCodes.BAD_GATEWAY))

    const distance = await sequelizeConnection.transaction(async (distance) => {
        const result = await Distance.findOne({
            where: {
                profile: profile,
                fromDestination: fromDestination,
                toDestination: toDestination
            },
            attributes: ['profile', 'distance', 'duration', 'distanceText', 'durationText']
        })

        if (!result) {
            const response = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`,
                {
                    params: {
                        alternatives: true,
                        geometries: 'geojson',
                        overview: 'simplified',
                        access_token: MAPBOX_TOKEN
                    }
                }
            );
            const newDistance = new Distance()
            newDistance.fromDestination = fromDestination
            newDistance.toDestination = toDestination
            newDistance.profile = profile
            newDistance.distance = Math.ceil(response.data.routes[0].distance)
            newDistance.duration = Math.ceil(response.data.routes[0].duration)
            newDistance.distanceText = newDistance.distance / 1000 > 1 ? Math.ceil(newDistance.distance / 100) / 10 + 'km' : newDistance.distance + 'm'
            const hour = newDistance.duration / 3600
            newDistance.durationText = hour > 1 ?
                Math.floor(hour) + 'h ' + (newDistance.duration - Math.floor(hour) * 3600 + ' p') : (newDistance.duration / 60 > 1 ?
                    Math.round(newDistance.duration / 60) + 'p' : newDistance.duration + 's')
            await newDistance.save({ transaction: distance })
            const result = await Distance.findOne({
                where: {
                    profile: profile,
                    fromDestination: fromDestination,
                    toDestination: toDestination
                },
                attributes: ['profile', 'distance', 'duration', 'distanceText', 'durationText'],
                transaction: distance
            })
            return result
        } else
            return result
    })
    res.resDocument = new RESDocument(StatusCodes.OK, 'success', { distance });
    next()

})