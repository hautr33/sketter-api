export const UserPrivateFields = [
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "gender",
        "dob",
        "phone",
        "address",
        "owner",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ],
    // Admin
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "gender",
        "dob",
        "phone",
        "address",
        "owner",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ],
    // Supplier Manager
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "name",
        "avatar",
        "gender",
        "dob",
        "phone",
        "address",
        "owner",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ],
    // Supplier
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "gender",
        "dob",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ],
    // Traveler
    [
        "password",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordUpdatedAt",
        "owner",
        "isActive",
        "authType",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ]
]

export class DestinationPrivateFields {
    static default = [
        "createdAt",
        "deletedAt",
        "updatedAt",
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
        "createdAt",
        "updatedAt",
        "deletedAt",
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
        "createdAt",
        "updatedAt",
        "deletedAt",
    ]
}


export class PlanPrivateFields {
    static default = [
        "travelerID",
        "createdAt",
        "deletedAt",
        "updatedAt",
    ];
}

export class PlanDetailPrivateFields {
    static default = [
        "planID",
        "destinationID",
        "checkinTime",
        "checkoutTime",
        "createdAt",
        "updatedAt",
        "deletedAt",
    ];
}