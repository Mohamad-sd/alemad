
export enum UserRole {
  COLLECTOR = 'collector',
  MANAGER = 'manager',
}

export enum PaymentMethod {
  CASH = 'نقدي',
  BANK_TRANSFER = 'تحويل بنكي',
}

export interface Location {
  id: string;
  name: string;
}

export interface Tenant {
  id: string;
  name: string;
  idNumber: string;
  idPhotoUrl: string;
}

export interface House {
  id: string;
  locationId: string;
  name: string; // e.g., "شقة 101" or "فيلا 5"
  tenantId: string | null;
  rentAmount: number;
  dueAmount: number;
  unpaidAmount: number;
  lastRentUpdate?: Date; // New field to track when rent was last added
  unpaidMonths: string[]; // List of specific months due e.g., ["2023-10", "2023-11"]
}

export interface Payment {
  id: string;
  houseId: string;
  amount: number;
  method: PaymentMethod;
  receiptUrl?: string;
  date: Date;
  collectorId: string;
}

export interface NewLeaseRequest {
  id: string;
  houseId: string;
  tenantName: string;
  tenantIdNumber: string;
  tenantIdPhoto: File;
  rentAmount: number;
  signatureDataUrl: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface VacateRequest {
  id: string;
  houseId: string;
  tenantId: string;
  videoDataUrl: string; // Base64 string of the video
  note?: string;
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CashHandover {
    id: string;
    collectorId: string;
    amount: number;
    date: Date;
}
