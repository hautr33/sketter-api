import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Status } from '../utils/constant';
import { Transaction } from '../models/transaction.model';
import sequelizeConnection from '../db/sequelize.db';
import { VoucherDetail } from '../models/voucher_detail.model';

export const checkVoucherOrder = async (
    _req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        const now = Date.now() - 1000 * 60 * 15
        const transactions = await Transaction.findAll({ where: { createdAt: { [Op.lte]: now }, status: Status.processing } });
        await sequelizeConnection.transaction(async (order) => {
            for (let i = 0; i < transactions.length; i++)
                await VoucherDetail.update({ status: Status.inStock, travelerID: null }, { where: { id: transactions[i].voucherDetailID }, transaction: order })
            await Transaction.update({ status: Status.failed }, { where: { createdAt: { [Op.lte]: now }, status: Status.processing }, transaction: order })
        })
        next();
    } catch (err: any) {
        next(err);
    }
};

