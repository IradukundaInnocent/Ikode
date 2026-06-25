import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  UserProfile, 
  Property, 
  Unit, 
  Lease, 
  MaintenanceRequest,
  LeaseHistoryEntry,
  MaintenanceLog
} from "./src/types";

const app = express();
const PORT = 3000;

let genAIClient: any = null;

function getGeminiClient(): any {
  if (!genAIClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please configure it in your Settings > Secrets.");
    }
    genAIClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAIClient;
}

function parseDataUrl(dataUrl: string) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const parts = dataUrl.split(";base64,");
  if (parts.length !== 2) return null;
  const mimeType = parts[0].split(";")[0].substring(5);
  const base64Data = parts[1];
  return { mimeType, base64Data };
}

// Increase body parser limit for base64 photo uploads (e.g. up to 10MB)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

const DB_PATH = path.resolve(process.cwd(), "data/db.json");

// Database Helper Functions
function getDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], properties: [], units: [], leases: [], maintenance: [], payments: [], documents: [], messages: [] }, null, 2));
    }
    const data = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (!parsed.payments) parsed.payments = [];
    if (!parsed.documents) parsed.documents = [];
    if (!parsed.messages) parsed.messages = [];
    return parsed;
  } catch (err) {
    console.error("Error reading database file:", err);
    return { users: [], properties: [], units: [], leases: [], maintenance: [], payments: [], documents: [], messages: [] };
  }
}

function saveDB(data: any) {
  try {
    // Ensure directory exists
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

// ================= API ENDPOINTS =================

// 1. Auth Endpoint: get profile or sign in/register
app.post("/api/auth/login", (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = getDB();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    // Create pre-profile, defer role assignment
    user = {
      id: "u-" + Date.now(),
      email: email.toLowerCase(),
      name: name || email.split("@")[0]
    };
    db.users.push(user);
    saveDB(db);
  }

  res.json({ success: true, profile: user });
});

// 2. Setup First-Time Admin Account
app.post("/api/auth/setup-admin", (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const db = getDB();
  // Check if any admin exists
  const hasAdmin = db.users.some((u: any) => u.role === "admin");
  if (hasAdmin) {
    return res.status(403).json({ error: "An administrator already exists. Setup is locked." });
  }

  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (user) {
    user.role = "admin";
    if (name) user.name = name;
  } else {
    user = {
      id: "u-" + Date.now(),
      email: email.toLowerCase(),
      name: name || "Initial Admin",
      role: "admin"
    };
    db.users.push(user);
  }

  saveDB(db);
  res.json({ success: true, profile: user });
});

// 3. User Roles management (Assign roles by Admin)
app.get("/api/users", (req, res) => {
  const db = getDB();
  res.json(db.users);
});

// Get admins count
app.get("/api/users/admins-count", (req, res) => {
  const db = getDB();
  const admins = db.users.filter((u: any) => u.role === "admin");
  res.json({ count: admins.length });
});

// Create user/provision with auto-role from admin panel
app.post("/api/users/provision", (req, res) => {
  const { email, name, role } = req.body;
  if (!email || !role) {
    return res.status(400).json({ error: "Email and role are required" });
  }

  const db = getDB();
  let user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  
  if (user) {
    // Update existing
    user.role = role;
    if (name) user.name = name;
  } else {
    user = {
      id: "u-" + Date.now(),
      email: email.toLowerCase(),
      name: name || email.split("@")[0],
      role
    };
    db.users.push(user);
  }

  saveDB(db);
  res.json({ success: true, user });
});

// Update single user role
app.put("/api/users/:email/role", (req, res) => {
  const { email } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }

  const db = getDB();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User profile not found" });
  }

  user.role = role;
  saveDB(db);
  res.json({ success: true, user });
});

// Delete user profile endpoint
app.delete("/api/users/:email", (req, res) => {
  const { email } = req.params;
  const db = getDB();
  const index = db.users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (index === -1) {
    return res.status(404).json({ error: "User profile not found" });
  }

  db.users.splice(index, 1);
  saveDB(db);
  res.json({ success: true, message: "User profile deleted successfully" });
});

// 4. Properties Management
app.get("/api/properties", (req, res) => {
  const db = getDB();
  res.json(db.properties);
});

app.post("/api/properties", (req, res) => {
  const { name, address, description, photos } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: "Name and address are required" });
  }

  const db = getDB();
  const newProperty: Property = {
    id: "prop-" + Date.now(),
    name,
    address,
    description: description || "",
    photos: photos || []
  };

  db.properties.push(newProperty);
  saveDB(db);
  res.json({ success: true, property: newProperty });
});

// Append photos to property
app.post("/api/properties/:id/photos", (req, res) => {
  const { id } = req.params;
  const { photos } = req.body; // array of photos

  if (!photos || !Array.isArray(photos)) {
    return res.status(400).json({ error: "Photos array is required" });
  }

  const db = getDB();
  const property = db.properties.find((p: any) => p.id === id);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  // Maximum of 12 photos
  property.photos = [...(property.photos || []), ...photos].slice(0, 12);
  saveDB(db);
  res.json({ success: true, property });
});

// Delete photo from building gallery
app.delete("/api/properties/:id/photos", (req, res) => {
  const { id } = req.params;
  const { photoIndex } = req.body;

  if (photoIndex === undefined) {
    return res.status(400).json({ error: "photoIndex is required" });
  }

  const db = getDB();
  const property = db.properties.find((p: any) => p.id === id);
  if (!property) {
    return res.status(404).json({ error: "Property not found" });
  }

  if (property.photos && property.photos[photoIndex] !== undefined) {
    property.photos.splice(photoIndex, 1);
    saveDB(db);
  }

  res.json({ success: true, property });
});


// 5. Units Management
app.get("/api/units", (req, res) => {
  const db = getDB();
  res.json(db.units);
});

app.post("/api/units", (req, res) => {
  const { propertyId, number, type, rentAmount } = req.body;
  if (!propertyId || !number || !rentAmount) {
    return res.status(400).json({ error: "Property, unit number, and rent amount are required" });
  }

  const db = getDB();
  const propExists = db.properties.some((p: any) => p.id === propertyId);
  if (!propExists) {
    return res.status(404).json({ error: "Property group not found" });
  }

  const newUnit: Unit = {
    id: "unit-" + Date.now(),
    propertyId,
    number,
    type: type || "Standard Unit",
    rentAmount: Number(rentAmount),
    status: "vacant",
    photos: []
  };

  db.units.push(newUnit);
  saveDB(db);
  res.json({ success: true, unit: newUnit });
});

// Append photos to unit
app.post("/api/units/:id/photos", (req, res) => {
  const { id } = req.params;
  const { photos } = req.body;

  if (!photos || !Array.isArray(photos)) {
    return res.status(400).json({ error: "Photos array of base64 strings is required" });
  }

  const db = getDB();
  const unit = db.units.find((u: any) => u.id === id);
  if (!unit) {
    return res.status(404).json({ error: "Unit not found" });
  }

  unit.photos = [...(unit.photos || []), ...photos].slice(0, 12);
  saveDB(db);
  res.json({ success: true, unit });
});


// 6. Leases Management (With automatic status sync)
app.get("/api/leases", (req, res) => {
  const db = getDB();
  res.json(db.leases);
});

// Create/Start Lease
app.post("/api/leases", (req, res) => {
  const { unitId, propertyId, tenantEmail, startDate, endDate, rentAmount, leaseType, createdBy } = req.body;

  if (!unitId || !tenantEmail || !startDate || !endDate || !rentAmount) {
    return res.status(400).json({ error: "Unit, tenant email, dates, and rent amount are required" });
  }

  const db = getDB();
  const unit = db.units.find((u: any) => u.id === unitId);
  if (!unit) {
    return res.status(404).json({ error: "Unit not found" });
  }

  // Set unit status to occupied
  unit.status = "occupied";

  // End any currently active lease on this unit first (clean state transition)
  db.leases.forEach((l: any) => {
    if (l.unitId === unitId && l.status === "active") {
      l.status = "ended";
      l.history.push({
        id: "lh-" + Date.now() + "-auto-end",
        date: new Date().toISOString(),
        action: "ended",
        details: "Lease auto-ended due to replacement contract activation.",
        changedBy: createdBy || "system"
      });
    }
  });

  const leaseId = "lease-" + Date.now();
  const actualLeaseType = leaseType === "service_fee" ? "service_fee" : "rent";
  const typeLabel = actualLeaseType === "service_fee" ? "Service Fee" : "Rent";
  
  const historyEntry: LeaseHistoryEntry = {
    id: "lh-init-" + Date.now(),
    date: new Date().toISOString(),
    action: "created",
    details: `Contract created as ${typeLabel} of FRW ${Number(rentAmount).toLocaleString()}/mo starting on ${startDate} up to ${endDate}.`,
    changedBy: createdBy || "landlord"
  };

  const newLease: Lease = {
    id: leaseId,
    unitId,
    propertyId: propertyId || unit.propertyId,
    tenantEmail: tenantEmail.toLowerCase(),
    startDate,
    endDate,
    rentAmount: Number(rentAmount),
    leaseType: actualLeaseType,
    status: "active",
    history: [historyEntry]
  };

  db.leases.push(newLease);
  saveDB(db);
  res.json({ success: true, lease: newLease });
});

// End Lease API (Sets unit status to vacant immediately)
app.post("/api/leases/:id/end", (req, res) => {
  const { id } = req.params;
  const { updatedBy, explanation } = req.body;

  const db = getDB();
  const lease = db.leases.find((l: any) => l.id === id);
  if (!lease) {
    return res.status(404).json({ error: "Lease not found" });
  }

  // Update lease status
  lease.status = "ended";

  // Append history entry
  lease.history.push({
    id: "lh-" + Date.now(),
    date: new Date().toISOString(),
    action: "ended",
    details: explanation || "Lease manually ended by landlord/admin.",
    changedBy: updatedBy || "landlord"
  });

  // Find associated unit and immediately update its status to vacant
  const unit = db.units.find((u: any) => u.id === lease.unitId);
  if (unit) {
    unit.status = "vacant";
  }

  saveDB(db);
  res.json({ success: true, lease, unit });
});

// Cancel Lease API (Sets unit status to vacant immediately)
app.post("/api/leases/:id/cancel", (req, res) => {
  const { id } = req.params;
  const { updatedBy, explanation } = req.body;

  const db = getDB();
  const lease = db.leases.find((l: any) => l.id === id);
  if (!lease) {
    return res.status(404).json({ error: "Lease not found" });
  }

  // Update lease status
  lease.status = "cancelled";

  // Append history entry
  lease.history.push({
    id: "lh-" + Date.now(),
    date: new Date().toISOString(),
    action: "cancelled",
    details: explanation || "Lease cancelled by authority.",
    changedBy: updatedBy || "landlord"
  });

  // Find associated unit and immediately update its status to vacant
  const unit = db.units.find((u: any) => u.id === lease.unitId);
  if (unit) {
    unit.status = "vacant";
  }

  saveDB(db);
  res.json({ success: true, lease, unit });
});

// Update Lease Agreement API (Highly requested flexible lease configuration & rules editing)
app.put("/api/leases/:id", (req, res) => {
  const { id } = req.params;
  const { rentAmount, tenantEmail, startDate, endDate, leaseType, status, updatedBy } = req.body;

  const db = getDB();
  const lease = db.leases.find((l: any) => l.id === id);
  if (!lease) {
    return res.status(404).json({ error: "Lease contract not found." });
  }

  // Trace older details to construct standard history entry
  const oldRent = lease.rentAmount;
  const oldEmail = lease.tenantEmail;
  const oldType = lease.leaseType;
  const oldStart = lease.startDate;
  const oldEnd = lease.endDate;
  const oldStatus = lease.status;

  const changes: string[] = [];
  if (rentAmount !== undefined && Number(rentAmount) !== oldRent) {
    lease.rentAmount = Number(rentAmount);
    changes.push(`monthly rate adjusted from FRW ${oldRent.toLocaleString()} to FRW ${Number(rentAmount).toLocaleString()}`);
  }
  if (tenantEmail !== undefined && tenantEmail.toLowerCase() !== oldEmail) {
    lease.tenantEmail = tenantEmail.toLowerCase();
    changes.push(`tenant email updated from ${oldEmail} to ${tenantEmail.toLowerCase()}`);
  }
  if (leaseType !== undefined && leaseType !== oldType) {
    lease.leaseType = leaseType;
    changes.push(`agreement type redefined from ${oldType} to ${leaseType}`);
  }
  if (startDate !== undefined && startDate !== oldStart) {
    lease.startDate = startDate;
    changes.push(`start date adjusted from ${oldStart} to ${startDate}`);
  }
  if (endDate !== undefined && endDate !== oldEnd) {
    lease.endDate = endDate;
    changes.push(`end date adjusted from ${oldEnd} to ${endDate}`);
  }
  if (status !== undefined && status !== oldStatus) {
    lease.status = status;
    changes.push(`administrative status modified from ${oldStatus} to ${status}`);
  }

  if (changes.length > 0) {
    lease.history.push({
      id: "lh-edit-" + Date.now(),
      date: new Date().toISOString(),
      action: "edited",
      details: `Agreement terms updated: ${changes.join("; ")}.`,
      changedBy: updatedBy || "landlord"
    });
    saveDB(db);
  }

  res.json({ success: true, lease });
});


// 7. Maintenance Management
app.get("/api/maintenance", (req, res) => {
  const db = getDB();
  res.json(db.maintenance);
});

// Tenant files maintenance request
app.post("/api/maintenance", (req, res) => {
  const { unitId, propertyId, title, description, category, priority, tenantEmail, photos } = req.body;

  if (!unitId || !propertyId || !title || !description || !category || !priority || !tenantEmail) {
    return res.status(400).json({ error: "All request fields are required to file a ticket." });
  }

  const db = getDB();
  const initialLog: MaintenanceLog = {
    id: "ml-init-" + Date.now(),
    date: new Date().toISOString(),
    status: "pending",
    updatedBy: tenantEmail,
    comments: "Issue submitted to landlady/landlord portals."
  };

  const newRequest: MaintenanceRequest = {
    id: "maint-" + Date.now(),
    unitId,
    propertyId,
    title,
    description,
    category,
    priority,
    status: "pending",
    tenantEmail: tenantEmail.toLowerCase(),
    photos: photos || [],
    logs: [initialLog]
  };

  db.maintenance.push(newRequest);
  saveDB(db);
  res.json({ success: true, request: newRequest });
});

// Landlord assigns technician
app.post("/api/maintenance/:id/assign", (req, res) => {
  const { id } = req.params;
  const { techEmail, updatedBy } = req.body;

  if (!techEmail) {
    return res.status(400).json({ error: "Technician email is required to assign." });
  }

  const db = getDB();
  const r = db.maintenance.find((item: any) => item.id === id);
  if (!r) {
    return res.status(404).json({ error: "Maintenance request not found." });
  }

  const techProfile = db.users.find((u: any) => u.email.toLowerCase() === techEmail.toLowerCase() && u.role === "technician");
  const techName = techProfile ? techProfile.name : techEmail;

  r.assignedTechEmail = techEmail.toLowerCase();
  r.status = "assigned";
  r.logs.push({
    id: "ml-assign-" + Date.now(),
    date: new Date().toISOString(),
    status: "assigned",
    updatedBy: updatedBy || "landlord",
    comments: `Assigned job to technician ${techName} (${techEmail}).`
  });

  saveDB(db);
  res.json({ success: true, request: r });
});

// Landlord, Tenant, or Technician progress updates
app.post("/api/maintenance/:id/update", (req, res) => {
  const { id } = req.params;
  const { status, comments, updatedBy, photo } = req.body;

  if (!status || !updatedBy) {
    return res.status(400).json({ error: "Status and updatedBy variables are required." });
  }

  const db = getDB();
  const r = db.maintenance.find((item: any) => item.id === id);
  if (!r) {
    return res.status(404).json({ error: "Maintenance request not found." });
  }

  r.status = status;
  
  const newLog: MaintenanceLog = {
    id: "ml-prog-" + Date.now(),
    date: new Date().toISOString(),
    status,
    updatedBy,
    comments: comments || `Status changed to ${status}.`,
    photo: photo || undefined
  };

  r.logs.push(newLog);

  // If a photo is attached to the log, also add it to client request photo gallery (up to 8 photos)
  if (photo) {
    r.photos = [...(r.photos || []), photo].slice(0, 8);
  }

  saveDB(db);
  res.json({ success: true, request: r });
});


// 8. General Dashboard Metrics endpoint for Landlord
app.get("/api/dashboard/landlord-stats", (req, res) => {
  const db = getDB();
  const propertiesCount = db.properties.length;
  const unitsCount = db.units.length;
  
  const occupiedUnits = db.units.filter((u: any) => u.status === "occupied").length;
  const occupancyRate = unitsCount > 0 ? Math.round((occupiedUnits / unitsCount) * 100) : 0;
  
  // Calculate expected monthly rent from occupied units
  const expectedRent = db.units
    .filter((u: any) => u.status === "occupied")
    .reduce((sum: number, u: any) => sum + (u.rentAmount || 0), 0);

  const openIssuesCount = db.maintenance.filter((m: any) => m.status !== "completed").length;

  res.json({
    totalProperties: propertiesCount,
    totalUnits: unitsCount,
    occupancyRate,
    expectedRent,
    openIssuesCount
  });
});

// 9. Payments (Rent & Service Charges) API endpoints
app.get("/api/payments", (req, res) => {
  const { email } = req.query;
  const db = getDB();
  
  // If we have some starting users and payments is empty, seed a couple of historical payments
  if (db.payments.length === 0) {
    db.payments = [
      {
        id: "pay-seed-1",
        leaseId: "lease-101",
        tenantEmail: "tenant1@gmail.com",
        date: "2026-05-01T08:00:00Z",
        amount: 3200, // Matching rent Amount USD/RWF
        description: "May rent payment - Oakridge Heights A101",
        reference: "MOMO-102948102-RWA",
        status: "successful"
      },
      {
        id: "pay-seed-2",
        leaseId: "lease-101",
        tenantEmail: "tenant1@gmail.com",
        date: "2026-06-01T09:30:00Z",
        amount: 3200,
        description: "June rent payment - Oakridge Heights A101",
        reference: "MOMO-930485710-RWA",
        status: "successful"
      },
      {
        id: "pay-seed-3",
        leaseId: "lease-102",
        tenantEmail: "tenant2@gmail.com",
        date: "2026-06-01T15:15:00Z",
        amount: 1850,
        description: "June rent payment - Oakridge Heights B102",
        reference: "MOMO-374928174-RWA",
        status: "successful"
      }
    ];
    saveDB(db);
  }

  if (email) {
    const list = db.payments.filter((p: any) => p.tenantEmail.toLowerCase() === String(email).toLowerCase());
    return res.json(list);
  }
  res.json(db.payments);
});

app.post("/api/payments", (req, res) => {
  const { leaseId, tenantEmail, amount, description, reference, status } = req.body;
  if (!tenantEmail || !amount) {
    return res.status(400).json({ error: "Tenant email and payment amount are required." });
  }

  const db = getDB();
  const newPayment = {
    id: "pay-" + Date.now(),
    leaseId: leaseId || "lease-custom",
    tenantEmail: tenantEmail.toLowerCase(),
    date: new Date().toISOString(),
    amount: Number(amount),
    description: description || "Rent Lease Payment",
    reference: reference || ("MOMO-" + Math.floor(Math.random() * 90000000 + 10000000) + "-RWA"),
    status: status || "successful"
  };

  db.payments.unshift(newPayment);
  saveDB(db);
  res.json({ success: true, payment: newPayment });
});

app.post("/api/payments/:id/approve", (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const payment = db.payments.find((p: any) => p.id === id);
  if (!payment) {
    return res.status(404).json({ error: "Payment record not found." });
  }
  payment.status = "successful";
  saveDB(db);
  res.json({ success: true, payment });
});

// 10. Property Documents API endpoints
app.get("/api/documents", (req, res) => {
  const { propertyId, email } = req.query;
  const db = getDB();

  // Seed default property documents if list is empty
  if (db.documents.length === 0) {
    db.documents = [
      {
        id: "doc-seed-1",
        title: "Mutual Residential Regulations & Bylaws 2026",
        propertyId: "prop-1",
        fileName: "Oakridge_Heights_House_Rules_2026.pdf",
        fileSize: "1.2 MB",
        category: "bylaw",
        uploadedAt: "2026-01-10T10:00:00Z",
        uploadedBy: "landlord@karemo.com"
      },
      {
        id: "doc-seed-2",
        title: "Emergency Evacuation Plan & Fire Safety Map",
        propertyId: "prop-1",
        fileName: "Oakridge_Fire_Safety_Map.pdf",
        fileSize: "4.8 MB",
        category: "other",
        uploadedAt: "2026-01-15T09:30:00Z",
        uploadedBy: "landlord@karemo.com"
      },
      {
        id: "doc-seed-3",
        title: "Water Tank Sanitation Certificate & Maintenance Notice",
        propertyId: "prop-2",
        fileName: "Pinecrest_Sanitation_Notice.pdf",
        fileSize: "750 KB",
        category: "other",
        uploadedAt: "2026-03-01T15:00:00Z",
        uploadedBy: "landlord@karemo.com"
      }
    ];
    saveDB(db);
  }

  let list = db.documents;
  if (propertyId) {
    list = list.filter((d: any) => d.propertyId === propertyId);
  }
  if (email) {
    // If filtered by email, locate their active leases to fetch their property ID, and join matching documents
    const myLeases = db.leases.filter((l: any) => l.tenantEmail.toLowerCase() === String(email).toLowerCase() && l.status === "active");
    const myPropIds = myLeases.map((l: any) => l.propertyId);
    list = list.filter((d: any) => !d.propertyId || myPropIds.includes(d.propertyId) || (d.tenantEmail && d.tenantEmail.toLowerCase() === String(email).toLowerCase()));
  }

  res.json(list);
});

app.post("/api/documents", (req, res) => {
  const { title, propertyId, unitId, tenantEmail, fileName, fileSize, category, fileData, uploadedBy } = req.body;
  if (!title || !fileName) {
    return res.status(400).json({ error: "Title and fileName are required." });
  }

  const db = getDB();
  const newDoc = {
    id: "doc-" + Date.now(),
    title,
    propertyId: propertyId || undefined,
    unitId: unitId || undefined,
    tenantEmail: tenantEmail ? tenantEmail.toLowerCase() : undefined,
    fileData: fileData || "", // base64 payload
    fileName,
    fileSize: fileSize || "120 KB",
    category: category || "other",
    uploadedAt: new Date().toISOString(),
    uploadedBy: uploadedBy || "landlord"
  };

  db.documents.unshift(newDoc);
  saveDB(db);
  res.json({ success: true, document: newDoc });
});

app.post("/api/documents/:id/ai-analyze", async (req, res) => {
  const { id } = req.params;
  const db = getDB();
  const doc = db.documents.find((d: any) => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    let aiNotes = "";
    const hasKey = !!process.env.GEMINI_API_KEY;

    if (!hasKey) {
      aiNotes = `[SIMULATED AI NOTE TAKER - Configure your GEMINI_API_KEY in Settings > Secrets to enable real Gemini analysis]\n\n` +
        `### Executive Summary\n` +
        `This is a **${doc.category.toUpperCase()}** type document titled "**${doc.title}**". It represents general building rules, lease terms, or receipt verifications uploaded under filename \`${doc.fileName}\`.\n\n` +
        `### Critical Rules & Policies\n` +
        `• **Code of Conduct:** Residents must respect quiet hours (typically 10 PM to 7 AM) and maintain common spaces in a sanitary condition.\n` +
        `• **Maintenance Submissions:** Any structural defect or emergency leak must be immediately filed in the Tenant Portal.\n` +
        `• **Access Authorizations:** Maintenance staff or landlords may enter the premises for repairs given a minimum 24-hour notice.\n\n` +
        `### Tenant Obligations\n` +
        `• Prompt payment of rent/service fees by the 5th of each month.\n` +
        `• Report any hazard or appliance malfunctions to prevent progressive damage.\n` +
        `• Follow statutory house waste segregation policies.\n\n` +
        `### Landlord Obligations\n` +
        `• Ensure clean water supply, structurally sound roofing, and secure entry ways.\n` +
        `• Coordinate urgent emergency work within a 24-hour turnaround.\n\n` +
        `### Important Milestones & Deadlines\n` +
        `• **Review Date:** Document was posted on **${new Date(doc.uploadedAt).toLocaleDateString()}**.\n` +
        `• **Policy Renewal:** General bylaws are updated annually each January.\n\n` +
        `*(This summary template is generated by the AI agent because the Gemini API key was not detected. Set a real GEMINI_API_KEY for dynamic scanning of actual attachment data using Gemini.)*`;
    } else {
      const client = getGeminiClient();
      
      const prompt = `You are an expert property management AI assistant. Analyze the following document details and generate an elegant, well-structured set of professional notes. 

Include:
1. ### Executive Summary: What is this document? What are its primary goals?
2. ### Critical Rules & Policies: Bulleted list of key guidelines or rules.
3. ### Tenant Obligations: Specific requirements for the resident/tenant.
4. ### Landlord & Management Obligations: Specific requirements for the management, landlord, or maintenance team.
5. ### Important Milestones & Deadlines: Any dates, grace periods, or action items specified.

Format the output clearly using elegant Markdown with headers, bullet points, and bold text. Keep the tone professional, objective, and highly practical.

Document Details:
- Title: ${doc.title}
- Filename: ${doc.fileName}
- Category: ${doc.category}
- Uploaded By: ${doc.uploadedBy}
`;

      if (doc.fileData && doc.fileData !== "DEMO_ATTACHMENT_CONTENT" && doc.fileData.startsWith("data:")) {
        const parsed = parseDataUrl(doc.fileData);
        if (parsed) {
          const { mimeType, base64Data } = parsed;
          const response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              prompt + "\n\nPlease also read the attached document and base your notes directly on its contents!"
            ]
          });
          aiNotes = response.text || "No notes could be generated from the document content.";
        } else {
          const response = await client.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt
          });
          aiNotes = response.text || "No notes could be generated.";
        }
      } else {
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt + "\n\n(Since the raw attachment binary is missing from this demo, generate a highly realistic and informative summary appropriate for this specific title and category.)"
        });
        aiNotes = response.text || "No notes could be generated.";
      }
    }

    doc.aiNotes = aiNotes;
    saveDB(db);
    res.json({ success: true, document: doc });
  } catch (err: any) {
    console.error("Gemini document analysis error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze document with Gemini." });
  }
});

app.put("/api/documents/:id/notes", (req, res) => {
  const { id } = req.params;
  const { userNotes } = req.body;

  const db = getDB();
  const doc = db.documents.find((d: any) => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  doc.userNotes = userNotes || "";
  saveDB(db);
  res.json({ success: true, document: doc });
});

// 11. Chat Messages / Landlord-Tenant Messaging API endpoints
app.get("/api/messages", (req, res) => {
  const { senderEmail, receiverEmail } = req.query;
  const db = getDB();

  // If chat messages are empty, preseed a small warm greeting message
  if (db.messages.length === 0) {
    db.messages = [
      {
        id: "msg-seed-1",
        senderEmail: "landlord@karemo.com",
        senderName: "James Karemo",
        receiverEmail: "tenant1@gmail.com",
        content: "Hello Sarah, welcome to Oakridge Heights unit A101! Let me know if you need anything regarding your lease or move-in checklists.",
        timestamp: "2026-06-18T10:00:00Z",
        read: true
      },
      {
        id: "msg-seed-2",
        senderEmail: "tenant1@gmail.com",
        senderName: "Sarah Miller",
        receiverEmail: "landlord@karemo.com",
        content: "Thank you James! The place is lovely. I filed a small request for the kitchen sink since there is a minor leak under the cabinets.",
        timestamp: "2026-06-19T14:40:00Z",
        read: true
      },
      {
        id: "msg-seed-3",
        senderEmail: "landlord@karemo.com",
        senderName: "James Karemo",
        receiverEmail: "tenant1@gmail.com",
        content: "Got it, I've assigned our technician Marcus to come take a look at it. He should coordinate with you shortly.",
        timestamp: "2026-06-20T09:05:00Z",
        read: true
      }
    ];
    saveDB(db);
  }

  let list = db.messages;
  if (senderEmail && receiverEmail) {
    // Exact conversation stream between two users
    list = list.filter((m: any) => 
      (m.senderEmail.toLowerCase() === String(senderEmail).toLowerCase() && m.receiverEmail.toLowerCase() === String(receiverEmail).toLowerCase()) ||
      (m.senderEmail.toLowerCase() === String(receiverEmail).toLowerCase() && m.receiverEmail.toLowerCase() === String(senderEmail).toLowerCase())
    );
  } else if (senderEmail) {
    // All messages involving sender as sender or receiver
    list = list.filter((m: any) => 
      m.senderEmail.toLowerCase() === String(senderEmail).toLowerCase() || 
      m.receiverEmail.toLowerCase() === String(senderEmail).toLowerCase()
    );
  }

  // Sort messages chronologically
  list.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  res.json(list);
});

app.post("/api/messages", (req, res) => {
  const { senderEmail, senderName, receiverEmail, content } = req.body;
  if (!senderEmail || !receiverEmail || !content) {
    return res.status(400).json({ error: "Sender, receiver and content are required." });
  }

  const db = getDB();
  const newMsg = {
    id: "msg-" + Date.now(),
    senderEmail: senderEmail.toLowerCase(),
    senderName: senderName || senderEmail.split("@")[0],
    receiverEmail: receiverEmail.toLowerCase(),
    content,
    timestamp: new Date().toISOString(),
    read: false
  };

  db.messages.push(newMsg);
  saveDB(db);
  res.json({ success: true, message: newMsg });
});

app.post("/api/messages/read", (req, res) => {
  const { senderEmail, receiverEmail } = req.body;
  if (!senderEmail || !receiverEmail) {
    return res.status(400).json({ error: "senderEmail and receiverEmail are required." });
  }
  const db = getDB();
  let count = 0;
  db.messages.forEach((m: any) => {
    if (
      m.senderEmail.toLowerCase() === senderEmail.toLowerCase() &&
      m.receiverEmail.toLowerCase() === receiverEmail.toLowerCase()
    ) {
      if (!m.read) {
        m.read = true;
        count++;
      }
    }
  });
  if (count > 0) {
    saveDB(db);
  }
  res.json({ success: true, markedReadCount: count });
});


// ================= VITE MIDDLEWARE SETUP =================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Ikode Server] Server running on http://localhost:${PORT}`);
  });
}

startServer();
