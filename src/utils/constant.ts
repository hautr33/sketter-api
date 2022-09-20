export enum Roles {
    'Admin' = 1,
    'Supplier Manager',
    'Supplier',
    'Traveler',
}

export enum PersonalityTypes {
    'Thích khám phá' = 1,
    'Ưa mạo hiểm',
    'Tìm kiếm sự thư giãn',
    'Đam mê với ẩm thực',
    'Đam mê với lịch sử, văn hóa',
    'Yêu thiên nhiên',
    'Giá rẻ là trên hết',
    'Có nhu cầu vui chơi, giải trí cao'
}

export class Catalogs{
    public static readonly stay = 'Lưu trú';
    public static readonly food = 'Ẩm thực';
    public static readonly exploration = 'Khám phá';
    public static readonly culture = 'Văn hóa';
}

export class Gender {
    public static readonly female = 'Nam';

    public static readonly male = 'Nữ';
}

export class Auth {
    public static readonly sketter = 'Sketter';

    public static readonly google = 'Google';
}
export class Status {
    public static readonly unverified = 'Unverified';

    public static readonly verified = 'Verified';

    public static readonly rejected = 'Rejected';

    public static readonly closed = 'Closed';
}