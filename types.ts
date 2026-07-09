export type UserRole = 'Admin' | 'AssetManager' | 'Client' | 'Auditor';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  address?: string;
}

export type AssetStatus = 'Available' | 'Assigned' | 'Under Maintenance' | 'Retired';

export interface Room {
  id: string;
  name: string;
  position: [number, number, number];
  imageUrl?: string;
  description?: string;
}

export interface Asset {
  id: string;
  assetId: string;
  assetType: string;
  location: string;
  status: AssetStatus;
  description: string;
  imageUrl?: string;
  floorPlanUrl?: string;
  aiAnalysis?: string;
  createdAt: string;
  rooms?: Room[];
  synthesisStatus?: 'Pending' | 'Generating' | 'Completed' | 'Failed';
  synthesisData?: any;
  glbUrl?: string;
  interiorStyle?: string;
}

export interface DigitalTwin {
  id: string;
  twinId: string;
  assetId: string;
  modelReference: string;
  healthScore: number;
  lastSyncTime: string;
}

export interface SensorData {
  id: string;
  sensorId: string;
  twinId: string;
  dataType: 'Temperature' | 'Humidity' | 'Vibration' | 'Usage';
  value: number;
  timeStamp: string;
}

export interface LeaseContract {
  id: string;
  contractId: string;
  clientId: string;
  assetId: string;
  startDate: string;
  endDate: string;
  paymentStatus: 'Pending' | 'Paid' | 'Overdue';
  status: 'Active' | 'Renewed' | 'Terminated';
}

export interface AppNotification {
  id: string;
  userId: string; // Target user (Admin or specific client)
  title: string;
  message: string;
  type: 'LeaseRequest' | 'Payment' | 'System';
  read: boolean;
  createdAt: string;
}
