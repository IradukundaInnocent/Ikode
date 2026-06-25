import { 
  UserProfile, 
  Property, 
  Unit, 
  Lease, 
  MaintenanceRequest, 
  DashboardStats,
  Payment,
  PropertyDocument,
  ChatMessage
} from "../types";

const API_BASE = ""; // Relative to host since custom server acts as a proxy via Vite

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/api/dashboard/landlord-stats`);
  if (!res.ok) throw new Error("Failed to fetch landlord dashboard statistics.");
  return res.json();
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const res = await fetch(`${API_BASE}/api/users`);
  if (!res.ok) throw new Error("Failed to fetch registered user profiles.");
  return res.json();
}

export async function loginOrRegister(email: string, name?: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) throw new Error("Authentication failed.");
  const data = await res.json();
  return data.profile;
}

export async function setupAdmin(email: string, name?: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/auth/setup-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name })
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Setup failed.");
  }
  const data = await res.json();
  return data.profile;
}

export async function fetchAdminsCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/api/users/admins-count`);
  if (!res.ok) throw new Error("Failed to read administration counts.");
  const data = await res.json();
  return data.count;
}

export async function provisionUser(email: string, name: string, role: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/users/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, role })
  });
  if (!res.ok) throw new Error("Failed to provision account.");
  const data = await res.json();
  return data.user;
}

export async function updateRole(email: string, role: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(email)}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role })
  });
  if (!res.ok) throw new Error("Failed to update role assignment.");
  const data = await res.json();
  return data.user;
}

export async function deleteUser(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(email)}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to delete user profile.");
  return res.json();
}

export async function fetchProperties(): Promise<Property[]> {
  const res = await fetch(`${API_BASE}/api/properties`);
  if (!res.ok) throw new Error("Failed to fetch property directory.");
  return res.json();
}

export async function createProperty(property: { name: string; address: string; description: string; photos?: string[] }): Promise<Property> {
  const res = await fetch(`${API_BASE}/api/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(property)
  });
  if (!res.ok) throw new Error("Failed to create property.");
  const data = await res.json();
  return data.property;
}

export async function addPropertyPhotos(propertyId: string, photos: string[]): Promise<Property> {
  const res = await fetch(`${API_BASE}/api/properties/${propertyId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos })
  });
  if (!res.ok) throw new Error("Failed to save property photos.");
  const data = await res.json();
  return data.property;
}

export async function deletePropertyPhoto(propertyId: string, photoIndex: number): Promise<Property> {
  const res = await fetch(`${API_BASE}/api/properties/${propertyId}/photos`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoIndex })
  });
  if (!res.ok) throw new Error("Failed to delete property photo.");
  const data = await res.json();
  return data.property;
}

export async function fetchUnits(): Promise<Unit[]> {
  const res = await fetch(`${API_BASE}/api/units`);
  if (!res.ok) throw new Error("Failed to fetch units list.");
  return res.json();
}

export async function createUnit(unit: { propertyId: string; number: string; type: string; rentAmount: number }): Promise<Unit> {
  const res = await fetch(`${API_BASE}/api/units`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(unit)
  });
  if (!res.ok) throw new Error("Failed to add housing unit.");
  const data = await res.json();
  return data.unit;
}

export async function addUnitPhotos(unitId: string, photos: string[]): Promise<Unit> {
  const res = await fetch(`${API_BASE}/api/units/${unitId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos })
  });
  if (!res.ok) throw new Error("Failed to add unit photos.");
  const data = await res.json();
  return data.unit;
}

export async function fetchLeases(): Promise<Lease[]> {
  const res = await fetch(`${API_BASE}/api/leases`);
  if (!res.ok) throw new Error("Failed to fetch leases.");
  return res.json();
}

export async function createLease(lease: { unitId: string; propertyId?: string; tenantEmail: string; startDate: string; endDate: string; rentAmount: number; leaseType?: 'rent' | 'service_fee'; createdBy: string }): Promise<Lease> {
  const res = await fetch(`${API_BASE}/api/leases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lease)
  });
  if (!res.ok) throw new Error("Failed to create active lease.");
  const data = await res.json();
  return data.lease;
}

export async function endLease(leaseId: string, updatedBy: string, explanation: string): Promise<{ success: boolean; lease: Lease; unit: Unit }> {
  const res = await fetch(`${API_BASE}/api/leases/${leaseId}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updatedBy, explanation })
  });
  if (!res.ok) throw new Error("Failed to end active lease agreement.");
  return res.json();
}

export async function cancelLease(leaseId: string, updatedBy: string, explanation: string): Promise<{ success: boolean; lease: Lease; unit: Unit }> {
  const res = await fetch(`${API_BASE}/api/leases/${leaseId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updatedBy, explanation })
  });
  if (!res.ok) throw new Error("Failed to cancel active lease agreement.");
  return res.json();
}

export async function updateLease(leaseId: string, params: { rentAmount?: number; tenantEmail?: string; startDate?: string; endDate?: string; leaseType?: 'rent' | 'service_fee'; status?: 'active' | 'ended' | 'cancelled' | 'defaulted'; updatedBy: string }): Promise<{ success: boolean; lease: Lease }> {
  const res = await fetch(`${API_BASE}/api/leases/${leaseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error("Failed to modify active lease contract metadata.");
  return res.json();
}

export async function fetchMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const res = await fetch(`${API_BASE}/api/maintenance`);
  if (!res.ok) throw new Error("Failed to fetch maintenance requests.");
  return res.json();
}

export async function createMaintenanceRequest(request: { unitId: string; propertyId: string; title: string; description: string; category: string; priority: 'low' | 'medium' | 'high'; tenantEmail: string; photos?: string[] }): Promise<MaintenanceRequest> {
  const res = await fetch(`${API_BASE}/api/maintenance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  if (!res.ok) throw new Error("Failed to file maintenance request ticket.");
  const data = await res.json();
  return data.request;
}

export async function assignTechnician(requestId: string, techEmail: string, updatedBy: string): Promise<MaintenanceRequest> {
  const res = await fetch(`${API_BASE}/api/maintenance/${requestId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ techEmail, updatedBy })
  });
  if (!res.ok) throw new Error("Failed to assign technician task.");
  const data = await res.json();
  return data.request;
}

export async function updateMaintenanceStatus(requestId: string, params: { status: string; comments: string; updatedBy: string; photo?: string }): Promise<MaintenanceRequest> {
  const res = await fetch(`${API_BASE}/api/maintenance/${requestId}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw new Error("Failed to update maintenance event.");
  const data = await res.json();
  return data.request;
}

export async function fetchPayments(email?: string): Promise<Payment[]> {
  const url = email ? `${API_BASE}/api/payments?email=${encodeURIComponent(email)}` : `${API_BASE}/api/payments`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch payments database ledger.");
  return res.json();
}

export async function createPayment(payment: { leaseId?: string; tenantEmail: string; amount: number; description?: string; reference?: string; status?: string }): Promise<Payment> {
  const res = await fetch(`${API_BASE}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payment)
  });
  if (!res.ok) throw new Error("Failed to post payment details.");
  const data = await res.json();
  return data.payment;
}

export async function approvePayment(paymentId: string): Promise<Payment> {
  const res = await fetch(`${API_BASE}/api/payments/${paymentId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Failed to verify and approve payment.");
  const data = await res.json();
  return data.payment;
}

export async function fetchDocuments(params?: { propertyId?: string; email?: string }): Promise<PropertyDocument[]> {
  let query = "";
  if (params) {
    const parts: string[] = [];
    if (params.propertyId) parts.push(`propertyId=${encodeURIComponent(params.propertyId)}`);
    if (params.email) parts.push(`email=${encodeURIComponent(params.email)}`);
    if (parts.length > 0) query = "?" + parts.join("&");
  }
  const res = await fetch(`${API_BASE}/api/documents${query}`);
  if (!res.ok) throw new Error("Failed to fetch property documents.");
  return res.json();
}

export async function uploadDocument(doc: { title: string; propertyId?: string; unitId?: string; tenantEmail?: string; fileName: string; fileSize?: string; category?: string; fileData?: string; uploadedBy?: string }): Promise<PropertyDocument> {
  const res = await fetch(`${API_BASE}/api/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc)
  });
  if (!res.ok) throw new Error("Failed to upload document reference.");
  const data = await res.json();
  return data.document;
}

export async function analyzeDocumentWithAI(id: string): Promise<PropertyDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/ai-analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Failed to analyze document with AI.");
  const data = await res.json();
  return data.document;
}

export async function saveDocumentNotes(id: string, userNotes: string): Promise<PropertyDocument> {
  const res = await fetch(`${API_BASE}/api/documents/${id}/notes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userNotes })
  });
  if (!res.ok) throw new Error("Failed to update custom document notes.");
  const data = await res.json();
  return data.document;
}

export async function fetchMessages(senderEmail?: string, receiverEmail?: string): Promise<ChatMessage[]> {
  let query = "";
  if (senderEmail && receiverEmail) {
    query = `?senderEmail=${encodeURIComponent(senderEmail)}&receiverEmail=${encodeURIComponent(receiverEmail)}`;
  } else if (senderEmail) {
    query = `?senderEmail=${encodeURIComponent(senderEmail)}`;
  }
  const res = await fetch(`${API_BASE}/api/messages${query}`);
  if (!res.ok) throw new Error("Failed to retrieve chat messages.");
  return res.json();
}

export async function sendMessage(msg: { senderEmail: string; senderName?: string; receiverEmail: string; content: string }): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg)
  });
  if (!res.ok) throw new Error("Failed to transmit chat message.");
  const data = await res.json();
  return data.message;
}

export async function markMessagesAsRead(senderEmail: string, receiverEmail: string): Promise<{ success: boolean; markedReadCount: number }> {
  const res = await fetch(`${API_BASE}/api/messages/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senderEmail, receiverEmail })
  });
  if (!res.ok) throw new Error("Failed to mark messages as read.");
  return res.json();
}

// Utility: Convert browser File to base64 string
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
