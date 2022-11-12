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
        "roleID",
        "travelerPersonalities"
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
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID",
        "travelerPersonalities"
    ],
    // Supplier Manager
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
        "roleID",
        "travelerPersonalities"
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
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt",
        "roleID",
        "travelerPersonalities"
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
        "updatedAt",
        'latinName',
        'image',
        'cityID',
    ];
    static getAllTraveler = [
        'cityID',
        "phone",
        'latinName',
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
        "avgRating",
        "view",
        "totalRating",
        "supplierID",
        "createdBy",
        "createdAt",
        "updatedAt",
        "deletedAt"
    ]
    static getAllSupplier = [
        'cityID',
        "phone",
        'latinName',
        "email",
        "description",
        "longitude",
        "latitude",
        "openingTime",
        "closingTime",
        "estimatedTimeStay",
        "view",
        "totalRating",
        "supplierID",
        "createdBy",
        "createdAt",
        "updatedAt",
        "deletedAt"
    ]
}

export class PlanPrivateFields {
    static default = [
        "isActive",
        "travelerID",
        "stayDestinationID",
        "deletedAt",
        "updatedAt"
    ];
}