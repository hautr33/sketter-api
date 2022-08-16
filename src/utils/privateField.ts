export const UserPrivateFields = [
    // Admin
    [
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
    ],
    // Supplier Manager
    [
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
        "iat",
        "exp",
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
        "iat",
        "exp",
        "firebaseID",
        "createdAt",
        "updatedAt"
    ]
]

export class DestinationPrivateFields {
    static default = [
        "createdAt",
        "deletedAt",
        "updatedAt"
    ];
}