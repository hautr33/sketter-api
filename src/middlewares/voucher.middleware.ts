import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Status } from '../utils/constant';
import { Transaction } from '../models/transaction.model';
import sequelizeConnection from '../db/sequelize.db';
import { VoucherDetail } from '../models/voucher_detail.model';
import { Voucher } from '../models/voucher.model';

export const checkVoucherOrder = async (
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const now = Date.now()
        const transactions = await Transaction.findAll({ where: { createdAt: { [Op.lte]: now - 1000 * 60 * 15 }, status: Status.processing } });
        await sequelizeConnection.transaction(async (order) => {

            await VoucherDetail.update({ status: 'Sold', usedAt: null }, { where: { status: 'Pending', usedAt: { [Op.lte]: now - 1000 * 60 * 15 } } })
            for (let i = 0; i < transactions.length; i++)
                await VoucherDetail.update({ status: Status.inStock, travelerID: null }, { where: { id: transactions[i].voucherDetailID }, transaction: order })
            await Transaction.update({ status: Status.failed }, { where: { createdAt: { [Op.lte]: now - 1000 * 60 * 15 }, status: Status.processing }, transaction: order })
        })
        const voucher = await Voucher.findAll({ where: { toDate: { [Op.lte]: (now - 1000 * 3600 * 24) }, status: { [Op.and]: [{ [Op.ne]: Status.draft }, { [Op.ne]: Status.expired }] } } });
        for (let i = 0; i < voucher.length; i++) {
            console.log('---------------------');

            const detail = await VoucherDetail.findAll({ where: { voucherID: voucher[i].id, status: 'Sold' } })
            for (let j = 0; j < detail.length; j++) {
                detail[j].finalPrice = Math.ceil(detail[j].price * (100 - detail[j].refundRate) * (100 - detail[j].commissionRate) / 10) / 1000
                console.log(detail[j].code + ' - ' + detail[j].finalPrice);
                const transaction = new Transaction()
                transaction.voucherDetailID = detail[j].id
                transaction.travelerID = detail[j].travelerID as string
                var date = new Date();
                var format = require('date-format');
                var orderId = format('hhmmss', date);
                transaction.orderID = orderId
                transaction.orderInfo = 'Refund ' + detail[j].code
                transaction.amount = Math.ceil(detail[j].price * (100 - detail[j].refundRate))
                transaction.vnpTransactionNo = (Date.now() + '').substring(5)
                transaction.vnpTransactionStatus = '00'
                transaction.transactionType = 'Refund'
                transaction.status = 'Success'
                // await transaction.save({ transaction: confirm })
            }
        }

        next();
    } catch (err: any) {
        next(err);
    }
};

