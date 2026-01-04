
import { Location, House, Tenant, Payment, NewLeaseRequest, CashHandover, UserRole, VacateRequest } from '../types';

const STORAGE_KEY = 'rent_app_db_production_v2';

// --- Initial Seed Data (Simulating a fresh database) ---
const initialLocations: Location[] = [
  { id: 'loc1', name: 'مجمع الرياض السكني' },
  { id: 'loc2', name: 'أبراج جدة' },
  { id: 'loc3', name: 'حي الدمام النموذجي' },
];

const initialTenants: Tenant[] = [
    { id: 'ten1', name: 'عبدالله محمد', idNumber: '1234567890', idPhotoUrl: 'https://picsum.photos/200/300' },
    { id: 'ten2', name: 'فاطمة علي', idNumber: '0987654321', idPhotoUrl: 'https://picsum.photos/200/300' },
];

// Added unpaidMonths to seed data
const initialHouses: House[] = [
  { id: 'house1', locationId: 'loc1', name: 'شقة 101', tenantId: 'ten1', rentAmount: 2500, dueAmount: 2500, unpaidAmount: 0, lastRentUpdate: new Date(), unpaidMonths: ['2023-10'] },
  { id: 'house2', locationId: 'loc1', name: 'شقة 102', tenantId: 'ten2', rentAmount: 2800, dueAmount: 5600, unpaidAmount: 2800, lastRentUpdate: new Date(), unpaidMonths: ['2023-09', '2023-10'] },
  { id: 'house3', locationId: 'loc1', name: 'شقة 103', tenantId: null, rentAmount: 2600, dueAmount: 0, unpaidAmount: 0, unpaidMonths: [] },
  { id: 'house4', locationId: 'loc2', name: 'فيلا A', tenantId: null, rentAmount: 5000, dueAmount: 0, unpaidAmount: 0, unpaidMonths: [] },
];

// Updated users with specific credentials
const initialUsers = [
  { email: 'user@elemad.ae', password: 'sameer@1234', role: UserRole.COLLECTOR, name: 'المحصل سمير' },
  { email: 'user1@alemad.ae', password: 'user1@1234', role: UserRole.COLLECTOR, name: 'المحصل 2' },
  { email: 'admin@elemad.ae', password: 'Omar@2018', role: UserRole.MANAGER, name: 'المدير عمر' },
];

// --- Interface for Database ---
interface DatabaseSchema {
    locations: Location[];
    houses: House[];
    tenants: Tenant[];
    payments: Payment[];
    leaseRequests: NewLeaseRequest[];
    vacateRequests: VacateRequest[];
    handovers: CashHandover[];
}

export const RentService = {
  // Simulate a small network delay for realism (optional)
  async _delay(ms = 100) {
      return new Promise(resolve => setTimeout(resolve, ms));
  },

  async init(): Promise<void> {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const initialData: DatabaseSchema = {
            locations: initialLocations,
            houses: initialHouses,
            tenants: initialTenants,
            payments: [],
            leaseRequests: [],
            vacateRequests: [],
            handovers: []
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
  },

  async getDatabase(): Promise<DatabaseSchema> {
      await this._delay(50); // Fast response
      const str = localStorage.getItem(STORAGE_KEY);
      const data = str ? JSON.parse(str) : null;
      
      if (data) {
          // Re-hydrate Date objects from JSON strings
          data.payments = (data.payments || []).map((p: any) => ({ ...p, date: new Date(p.date) }));
          data.handovers = (data.handovers || []).map((h: any) => ({ ...h, date: new Date(h.date) }));
          data.vacateRequests = (data.vacateRequests || []).map((v: any) => ({ ...v, date: new Date(v.date) }));
          data.houses = (data.houses || []).map((h: any) => ({ 
              ...h, 
              lastRentUpdate: h.lastRentUpdate ? new Date(h.lastRentUpdate) : null,
              unpaidMonths: h.unpaidMonths || [] // Ensure array exists for legacy data
          }));
          
          // --- ROBUST AUTOMATIC RENT ACCRUAL LOGIC ---
          const now = new Date();
          let hasChanges = false;

          data.houses = data.houses.map((h: House) => {
              // Only process occupied houses
              if (!h.tenantId) return h;

              // Parse stored date or default to now if missing (to prevent massive initial charge)
              let lastUpdate = h.lastRentUpdate ? new Date(h.lastRentUpdate) : new Date();
              
              // We want to check if we moved to a new month relative to the last update.
              // Logic: Loop adding months until lastUpdate matches current month/year
              
              let updatedHouse = { ...h };
              let modified = false;

              // While lastUpdate's Month < Current Month (handling year rollover)
              // This loop runs for every month missed.
              while (
                  (lastUpdate.getFullYear() < now.getFullYear()) || 
                  (lastUpdate.getFullYear() === now.getFullYear() && lastUpdate.getMonth() < now.getMonth())
              ) {
                  // Move to next month
                  lastUpdate.setMonth(lastUpdate.getMonth() + 1);
                  
                  // Construct month string YYYY-MM
                  const monthStr = `${lastUpdate.getFullYear()}-${(lastUpdate.getMonth() + 1).toString().padStart(2, '0')}`;
                  
                  console.log(`Accruing rent for ${h.name}: ${monthStr}`);
                  
                  updatedHouse.dueAmount += updatedHouse.rentAmount;
                  updatedHouse.unpaidMonths.push(monthStr);
                  updatedHouse.lastRentUpdate = new Date(lastUpdate); // Update the tracker
                  modified = true;
                  hasChanges = true;
              }

              return modified ? updatedHouse : h;
          });

          if (hasChanges) {
              await this.saveDatabase(data);
          }
      }
      return data;
  },

  async saveDatabase(data: DatabaseSchema): Promise<void> {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  // --- Auth Service ---
  authenticate(email: string, password: string): UserRole | null {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      
      const user = initialUsers.find(u => 
        u.email.toLowerCase() === cleanEmail && 
        u.password === cleanPassword
      );
      return user ? user.role : null;
  },

  // --- Transactional Methods (Business Logic) ---
  
  async addPayment(paymentData: Omit<Payment, 'id' | 'date' | 'collectorId'>) {
      const db = await this.getDatabase();
      
      const newPayment: Payment = { 
          ...paymentData, 
          id: `pay${Date.now()}`, 
          date: new Date(), 
          collectorId: 'collector1' 
      };
      
      db.payments.push(newPayment);

      // Backend Logic: Update House Balance & Remove Paid Months
      db.houses = db.houses.map(h => {
          if (h.id === paymentData.houseId) {
              const newDueAmount = Math.max(0, h.dueAmount - paymentData.amount);
              
              // Calculate how many FULL months were covered by this payment
              // This is a heuristic: we remove the oldest months first based on rent amount
              const rent = h.rentAmount > 0 ? h.rentAmount : paymentData.amount;
              const monthsCovered = Math.floor(paymentData.amount / rent);
              
              let newUnpaidMonths = [...(h.unpaidMonths || [])];
              if (monthsCovered > 0 && newUnpaidMonths.length > 0) {
                  // Remove oldest X months
                  newUnpaidMonths.splice(0, monthsCovered);
              }

              return { 
                  ...h, 
                  dueAmount: newDueAmount,
                  unpaidMonths: newUnpaidMonths
              };
          }
          return h;
      });

      await this.saveDatabase(db);
      return { payment: newPayment, houses: db.houses };
  },

  async addLeaseRequest(requestData: Omit<NewLeaseRequest, 'id' | 'status'>) {
      const db = await this.getDatabase();
      const newRequest: NewLeaseRequest = {
          ...requestData,
          id: `req${Date.now()}`,
          status: 'pending'
      };
      db.leaseRequests.push(newRequest);
      await this.saveDatabase(db);
      return newRequest;
  },

  async approveLeaseRequest(requestId: string) {
      const db = await this.getDatabase();
      const requestIndex = db.leaseRequests.findIndex(r => r.id === requestId);
      if (requestIndex === -1) return null;

      const request = db.leaseRequests[requestIndex];
      request.status = 'approved';

      // Create new tenant
      const newTenant: Tenant = {
          id: `ten${Date.now()}`,
          name: request.tenantName,
          idNumber: request.tenantIdNumber,
          idPhotoUrl: 'https://picsum.photos/200/300',
      };
      db.tenants.push(newTenant);

      // Current month string for initial rent
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      // Assign tenant to house
      db.houses = db.houses.map(house => {
          if (house.id === request.houseId) {
              return {
                  ...house,
                  tenantId: newTenant.id,
                  rentAmount: request.rentAmount,
                  dueAmount: request.rentAmount, // Initial rent due
                  unpaidAmount: 0,
                  lastRentUpdate: now, // Set current date as the start of billing
                  unpaidMonths: [currentMonthStr] // Add current month as first unpaid month
              };
          }
          return house;
      });

      await this.saveDatabase(db);
      return { tenants: db.tenants, houses: db.houses, leaseRequests: db.leaseRequests };
  },

  async rejectLeaseRequest(requestId: string) {
      const db = await this.getDatabase();
      const request = db.leaseRequests.find(r => r.id === requestId);
      if (request) {
          request.status = 'rejected';
          await this.saveDatabase(db);
      }
      return db.leaseRequests;
  },

  // --- Vacate Request Logic ---

  async requestVacation(requestData: Omit<VacateRequest, 'id' | 'date' | 'status'>) {
      const db = await this.getDatabase();
      const newRequest: VacateRequest = {
          ...requestData,
          id: `vac${Date.now()}`,
          date: new Date(),
          status: 'pending'
      };
      // Ensure the array exists (migration safety)
      if (!db.vacateRequests) db.vacateRequests = [];
      
      db.vacateRequests.push(newRequest);
      await this.saveDatabase(db);
      return newRequest;
  },

  async approveVacateRequest(requestId: string) {
      const db = await this.getDatabase();
      const request = db.vacateRequests.find(r => r.id === requestId);
      if (!request) return null;

      request.status = 'approved';

      // Perform the actual vacation logic here
      db.houses = db.houses.map(h => {
          if (h.id === request.houseId) {
              // Clear tenant, reset amounts, clear months
              const { lastRentUpdate, ...rest } = h; 
              return { 
                  ...rest, 
                  tenantId: null, 
                  dueAmount: 0, 
                  unpaidAmount: 0,
                  unpaidMonths: []
              };
          }
          return h;
      });

      await this.saveDatabase(db);
      return { houses: db.houses, vacateRequests: db.vacateRequests };
  },

  async rejectVacateRequest(requestId: string) {
      const db = await this.getDatabase();
      const request = db.vacateRequests.find(r => r.id === requestId);
      if (request) {
          request.status = 'rejected';
          await this.saveDatabase(db);
      }
      return db.vacateRequests;
  },

  async addCashHandover(amount: number) {
      const db = await this.getDatabase();
      const newHandover: CashHandover = {
          id: `hand${Date.now()}`,
          collectorId: 'collector1',
          amount,
          date: new Date()
      };
      db.handovers.push(newHandover);
      await this.saveDatabase(db);
      return newHandover;
  },

  // --- Locations Management ---
  async addLocation(name: string) {
    const db = await this.getDatabase();
    db.locations.push({ id: `loc${Date.now()}`, name });
    await this.saveDatabase(db);
    return db.locations;
  },

  async updateLocation(id: string, name: string) {
      const db = await this.getDatabase();
      db.locations = db.locations.map(l => l.id === id ? { ...l, name } : l);
      await this.saveDatabase(db);
      return db.locations;
  },

  async deleteLocation(id: string) {
      const db = await this.getDatabase();
      const hasHouses = db.houses.some(h => h.locationId === id);
      if (hasHouses) throw new Error("لا يمكن حذف موقع يحتوي على عقارات. قم بحذف العقارات أو نقلها أولاً.");
      
      db.locations = db.locations.filter(l => l.id !== id);
      await this.saveDatabase(db);
      return db.locations;
  },

  // --- House Management ---
  async addHouse(houseData: any) {
      const db = await this.getDatabase();
      const newHouse = {
          id: `house${Date.now()}`,
          tenantId: null,
          dueAmount: 0,
          unpaidAmount: 0,
          unpaidMonths: [],
          ...houseData
      };
      db.houses.push(newHouse);
      await this.saveDatabase(db);
      return db.houses;
  },

  async deleteHouse(id: string) {
      const db = await this.getDatabase();
      const house = db.houses.find(h => h.id === id);
      
      if (!house) throw new Error("العقار غير موجود");
      if (house.tenantId) throw new Error("لا يمكن حذف عقار مسكون (مؤجر). قم بإخلاء العقار أولاً.");
      
      db.houses = db.houses.filter(h => h.id !== id);
      await this.saveDatabase(db);
      return db.houses;
  }
};
