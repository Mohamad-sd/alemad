
import { useState, useCallback, useEffect } from 'react';
import { Location, House, Tenant, Payment, NewLeaseRequest, CashHandover, UserRole, VacateRequest } from '../types';
import { RentService } from '../services/rentService';

export const useAppData = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leaseRequests, setLeaseRequests] = useState<NewLeaseRequest[]>([]);
  const [vacateRequests, setVacateRequests] = useState<VacateRequest[]>([]);
  const [handovers, setHandovers] = useState<CashHandover[]>([]);

  // Initialize and Fetch Data
  useEffect(() => {
    const loadData = async () => {
        await RentService.init();
        const data = await RentService.getDatabase();
        if (data) {
            setLocations(data.locations);
            setHouses(data.houses);
            setTenants(data.tenants);
            setPayments(data.payments);
            setLeaseRequests(data.leaseRequests);
            setVacateRequests(data.vacateRequests || []);
            setHandovers(data.handovers);
        }
        setIsLoaded(true);
    };
    loadData();
  }, []);

  const refreshData = async () => {
      const data = await RentService.getDatabase();
      if (data) {
          setLocations(data.locations);
          setHouses(data.houses);
          setTenants(data.tenants);
          setPayments(data.payments);
          setLeaseRequests(data.leaseRequests);
          setVacateRequests(data.vacateRequests || []);
          setHandovers(data.handovers);
      }
  };

  const authenticate = useCallback((email: string, password: string): UserRole | null => {
    return RentService.authenticate(email, password);
  }, []);

  const addPayment = useCallback(async (paymentData: any) => {
    const result = await RentService.addPayment(paymentData);
    setPayments(prev => [...prev, result.payment]);
    setHouses(result.houses);
  }, []);

  const addLeaseRequest = useCallback(async (requestData: any) => {
      const newReq = await RentService.addLeaseRequest(requestData);
      setLeaseRequests(prev => [...prev, newReq]);
  }, []);

  const approveLeaseRequest = useCallback(async (requestId: string) => {
    const result = await RentService.approveLeaseRequest(requestId);
    if (result) {
        setTenants(result.tenants);
        setHouses(result.houses);
        setLeaseRequests(result.leaseRequests);
    }
  }, []);

  const rejectLeaseRequest = useCallback(async (requestId: string) => {
      const updatedRequests = await RentService.rejectLeaseRequest(requestId);
      setLeaseRequests(updatedRequests);
  }, []);

  // --- Vacate Logic ---
  const requestVacation = useCallback(async (data: any) => {
      const newReq = await RentService.requestVacation(data);
      setVacateRequests(prev => [...prev, newReq]);
  }, []);

  const approveVacateRequest = useCallback(async (requestId: string) => {
      const result = await RentService.approveVacateRequest(requestId);
      if (result) {
          setHouses(result.houses);
          setVacateRequests(result.vacateRequests);
      }
  }, []);

  const rejectVacateRequest = useCallback(async (requestId: string) => {
      const updatedRequests = await RentService.rejectVacateRequest(requestId);
      setVacateRequests(updatedRequests);
  }, []);

  // --- Other ---
  
  const addCashHandover = useCallback(async (amount: number) => {
    const newHandover = await RentService.addCashHandover(amount);
    setHandovers(prev => [...prev, newHandover]);
  }, []);

  const addLocation = useCallback(async (name: string) => {
    const updated = await RentService.addLocation(name);
    setLocations(updated);
  }, []);

  const updateLocation = useCallback(async (id: string, name: string) => {
    const updated = await RentService.updateLocation(id, name);
    setLocations(updated);
  }, []);

  const deleteLocation = useCallback(async (id: string) => {
    try {
        const updated = await RentService.deleteLocation(id);
        setLocations(updated);
    } catch (e: any) {
        alert(e.message);
    }
  }, []);

  const addHouse = useCallback(async (data: any) => {
    const updated = await RentService.addHouse(data);
    setHouses(updated);
  }, []);

  const updateHouse = useCallback((id: string, data: Partial<House>) => {
    setHouses(prev => prev.map(h => (h.id === id ? { ...h, ...data } : h)));
  }, []);

  const deleteHouse = useCallback(async (id: string) => {
    try {
        const updatedHouses = await RentService.deleteHouse(id);
        setHouses(updatedHouses);
    } catch (e: any) {
        alert(e.message);
    }
  }, []);

  // Removed direct vacateHouse, replaced by requestVacation -> approveVacateRequest
  const vacateHouse = useCallback(async (houseId: string) => {
      // Deprecated, keeping for interface compatibility if needed, but logic moved to Manager
      console.warn("Direct vacateHouse is deprecated. Use requestVacation.");
  }, []);

  return { 
      locations, houses, tenants, payments, leaseRequests, vacateRequests, handovers, isLoaded,
      authenticate, addPayment, addLeaseRequest, approveLeaseRequest, rejectLeaseRequest,
      requestVacation, approveVacateRequest, rejectVacateRequest,
      vacateHouse, addCashHandover, addLocation, updateLocation, deleteLocation,
      addHouse, updateHouse, deleteHouse, refreshData
    };
};
