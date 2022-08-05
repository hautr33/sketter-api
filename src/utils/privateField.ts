export class UserPrivateFields {
    static default = [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "gender",
        "dob",
        "owner",
        "isActive",
        "authType",
        "iat",
        "exp",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ];

    static traveler = [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "owner",
        "isActive",
        "authType",
        "iat",
        "exp",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ];

    static supplier = [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "gender",
        "dob",
        "isActive",
        "authType",
        "iat",
        "exp",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ];
}

export class DestinationPrivateFields {
    static default = [
        "phone",
        "email",
        "description",
        "longitude",
        "latitude",
        "estimatedTimeStay",
        "supplierID",
        "createdAt",
        "updatedAt"
    ];
}