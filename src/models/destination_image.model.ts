import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { DataTypes, ForeignKey, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import sequelize from '../db/sequelize.db';
import { Destination } from './destination.model';

export class Destination_Image extends Model<InferAttributes<Destination_Image>, InferCreationAttributes<Destination_Image>> {
    declare destinationID: ForeignKey<Destination['id']>;
    imgURL!: string | null;
}

Destination_Image.init({
    // Model attributes are defined here
    destinationID: {
        type: DataTypes.UUID,
        primaryKey: true
    },
    imgURL: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
}, {
    // Other model options go here
    timestamps: false,
    sequelize: sequelize, // We need to pass the connection instance
    modelName: 'Destination_Image' // We need to choose the model name
});

Destination.hasMany(Destination_Image, {
    foreignKey: "destinationID"
});

Destination_Image.afterFind(async (destinationImg) => {
    if (destinationImg) {
        const img = (destinationImg as Destination_Image).imgURL;
        if (img) {
            const storage = getStorage();
            await getDownloadURL(ref(storage, img))
                .then((url) => {
                    (destinationImg as Destination_Image).imgURL = url as string;
                })
                .catch(() => {
                    (destinationImg as Destination_Image).imgURL = null;
                })
        }
    }
})