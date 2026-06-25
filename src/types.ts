export type UserRole = 'admin' | 'landlord' | 'tenant' | 'technician' | 'property_manager' | 'accountant' | 'leasing_officer' | 'property_owner' | 'security_guard' | 'receptionist';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  description: string;
  photos: string[]; // List of base64 or sample image paths
}

export interface Unit {
  id: string;
  propertyId: string;
  number: string; // e.g. "A101"
  type: string; // e.g. "2 Bedroom, 2 Bath"
  rentAmount: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  photos: string[];
}

export interface LeaseHistoryEntry {
  id: string;
  date: string;
  action: 'created' | 'ended' | 'cancelled' | 'renewed';
  details: string;
  changedBy: string;
}

export interface Lease {
  id: string;
  unitId: string;
  propertyId: string;
  tenantEmail: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  leaseType: 'rent' | 'service_fee'; // 'rent' covers full rent, 'service_fee' covers service charge only
  status: 'active' | 'ended' | 'cancelled' | 'defaulted';
  history: LeaseHistoryEntry[];
}

export interface MaintenanceLog {
  id: string;
  date: string;
  status: 'pending' | 'assigned' | 'progressing' | 'completed';
  updatedBy: string; // user email
  comments: string;
  photo?: string; // Optional progress photo
}

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  propertyId: string;
  title: string;
  description: string;
  category: string; // e.g., 'plumbing', 'electrical', 'appliance', 'structural', 'other'
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'assigned' | 'progressing' | 'completed';
  tenantEmail: string;
  assignedTechEmail?: string;
  photos: string[]; // uploads or base64
  logs: MaintenanceLog[];
}

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupancyRate: number;
  expectedRent: number;
  openIssuesCount: number;
}

export interface Payment {
  id: string;
  leaseId: string;
  tenantEmail: string;
  date: string;
  amount: number;
  description: string;
  reference: string;
  status: "successful" | "processing" | "failed" | "pending_verification";
}

export interface PropertyDocument {
  id: string;
  title: string;
  propertyId?: string;
  unitId?: string;
  tenantEmail?: string;
  fileData?: string; // Content or dummy url
  fileName: string;
  fileSize: string;
  category: "lease" | "receipt" | "bylaw" | "identification" | "other";
  uploadedAt: string;
  uploadedBy: string;
  aiNotes?: string;
  userNotes?: string;
}

export interface ChatMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  receiverEmail: string; // usually 'landlord' or specific landlord email, or 'tenant'
  content: string;
  timestamp: string;
  read: boolean;
}

