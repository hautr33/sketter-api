export enum Roles {
    'Admin' = 1,
    'Supplier Manager',
    'Supplier',
    'Traveler',
}

export enum Catalogs {
    'Quán ăn' = 1,
    'Quán cà phê',
    'Địa điểm du lịch',
    'Homestay',
    'Khách sạn',
    'Biệt thự',
    'Khu nghỉ dưỡng cao cấp',
    'Nhà xe'
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

    public static readonly reject = 'Reject';

    public static readonly closed = 'Closed';
}