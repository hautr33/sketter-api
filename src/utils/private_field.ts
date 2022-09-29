export const UserPrivateFields = [
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "verifyCode",
        "verifyCodeExpires",
        "gender",
        "dob",
        "phone",
        "address",
        "owner",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID"
    ],
    // Admin
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "verifyCode",
        "verifyCodeExpires",
        "gender",
        "dob",
        "phone",
        "address",
        "owner",
        "isActive",
        "status",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID"
    ],
    // Supplier Manager
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "verifyCode",
        "verifyCodeExpires",
        "name",
        "avatar",
        "gender",
        "dob",
        "phone",
        "address",
        "owner",
        "isActive",
        "status",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID"
    ],
    // Supplier
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "verifyCode",
        "verifyCodeExpires",
        "gender",
        "dob",
        "isActive",
        "status",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID"
    ],
    // Traveler
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "verifyCode",
        "verifyCodeExpires",
        "owner",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID"
    ]
]

export class DestinationPrivateFields {
    static default = [
        "supplierID",
        "createdBy",
        "createdAt",
        "deletedAt",
        "updatedAt"
    ];
    static getAllTraveler = [
        "phone",
        "email",
        "description",
        "longitude",
        "latitude",
        "lowestPrice",
        "highestPrice",
        "openingTime",
        "closingTime",
        "estimatedTimeStay",
        "status",
        "rating",
        "view",
        "comment",
        "supplierID",
        "createdBy",
        "createdAt",
        "updatedAt",
        "deletedAt"
    ]
    static getAllSupplier = [
        "phone",
        "email",
        "description",
        "longitude",
        "latitude",
        "openingTime",
        "closingTime",
        "estimatedTimeStay",
        "view",
        "comment",
        "supplierID",
        "createdBy",
        "createdAt",
        "updatedAt",
        "deletedAt"
    ]
}

export class DestinationImagePrivateFields {
    static default = [
        "id",
        "destinationID"
    ];
}

export class PlanPrivateFields {
    static default = [
        "isActive",
        "travelerID",
        "createdAt",
        "deletedAt",
        "updatedAt"
    ];
}

export class PlanDetailPrivateFields {
    static default = [
        "id",
        "planID",
        "stayDestinationID"
    ];
}

export class PlanDestinationPrivateFields {
    static default = [
        "id",
        "planDetailID",
        "checkinTime",
        "checkoutTime"
    ];
    static getOne = [
        "id",
        "planDetailID",
        "destinationID",
        "checkinTime",
        "checkoutTime"
    ];
}