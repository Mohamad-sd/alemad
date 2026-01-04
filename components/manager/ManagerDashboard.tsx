
import React, { useState, useContext, useMemo } from 'react';
import { AppDataContext } from '../../App';
import { House, NewLeaseRequest, Location, Payment } from '../../types';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import Input from '../shared/Input';
import Select from '../shared/Select';
import BuildingIcon from '../icons/BuildingIcon';
import HomeIcon from '../icons/HomeIcon';
import DollarSignIcon from '../icons/DollarSignIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import XCircleIcon from '../icons/XCircleIcon';
import ReportIcon from '../icons/ReportIcon';
import TrashIcon from '../icons/TrashIcon';
import UserIcon from '../icons/UserIcon';
import DownloadIcon from '../icons/DownloadIcon';
import WhatsAppIcon from '../icons/WhatsAppIcon';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type ManagerView = 'dashboard' | 'management' | 'approvals' | 'handovers';

const ManagerDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<ManagerView>('dashboard');
  const context = useContext(AppDataContext);

  if (!context || !context.isLoaded) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;

  const pendingCount = (context.leaseRequests.filter(r => r.status === 'pending').length) + (context.vacateRequests.filter(r => r.status === 'pending').length);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardStats />;
      case 'management': return <PropertyManagementScreen />;
      case 'approvals': return <ApprovalsScreen />;
      case 'handovers': return <CashHandoverScreen />;
      default: return <DashboardStats />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-72 bg-gray-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg"><BuildingIcon className="w-6 h-6"/></div>
          <h1 className="text-xl font-bold tracking-tight">لوحة الإدارة</h1>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <SidebarLink active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} label="نظرة عامة والتقارير" icon={<DollarSignIcon className="w-5 h-5"/>} />
          <SidebarLink active={currentView === 'management'} onClick={() => setCurrentView('management')} label="إدارة العقارات" icon={<HomeIcon className="w-5 h-5"/>} />
          <SidebarLink active={currentView === 'approvals'} onClick={() => setCurrentView('approvals')} label="الموافقات" icon={<CheckCircleIcon className="w-5 h-5"/>} badge={pendingCount} />
          <SidebarLink active={currentView === 'handovers'} onClick={() => setCurrentView('handovers')} label="تسليم المبالغ" icon={<ReportIcon className="w-5 h-5"/>} />
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white transition-all font-bold">تسجيل الخروج</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

const SidebarLink = ({ active, onClick, label, icon, badge }: any) => (
    <button onClick={onClick} className={`flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium">{label}</span>
        </div>
        {badge > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
    </button>
);

// --- Export Helper Function for CSV ---
const exportToCSV = (data: any[], headers: string[], filename: string) => {
    let csvContent = "\uFEFF"; 
    csvContent += headers.join(",") + "\n";
    data.forEach(row => {
        const rowString = Object.values(row).map(value => {
            const stringValue = String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(",");
        csvContent += rowString + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Helper for PDF Share ---
const sharePDF = async (title: string, head: string[][], body: (string|number)[][], fileName: string) => {
    const doc = new jsPDF();
    
    // Add Title
    doc.setFontSize(18);
    doc.text(title, 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 105, 22, { align: 'center' });

    // Create Table
    autoTable(doc, {
        head: head,
        body: body,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], halign: 'center' },
        bodyStyles: { halign: 'center' },
    });

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });

    // Try Web Share API (Mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: title,
                text: `Here is the ${title} report.`,
            });
        } catch (error) {
            console.log('Sharing failed', error);
        }
    } else {
        // Fallback for Desktop: Download + WhatsApp Web Link
        doc.save(`${fileName}.pdf`);
        const waUrl = `https://wa.me/?text=${encodeURIComponent(`Please find the attached ${title} (downloaded to your device).`)}`;
        window.open(waUrl, '_blank');
    }
};

const DashboardStats = () => {
    const context = useContext(AppDataContext);
    const stats = useMemo(() => {
        const houses = context?.houses || [];
        const payments = context?.payments || [];
        const rentedCount = houses.filter(h => h.tenantId).length;
        const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
        const totalDue = houses.reduce((s, h) => s + h.dueAmount, 0);
        return { rentedCount, vacantCount: houses.length - rentedCount, totalCollected, totalDue };
    }, [context]);

    const handleExportPayments = () => {
        if (!context) return;
        const data = context.payments.map(p => {
            const house = context.houses.find(h => h.id === p.houseId);
            return {
                Date: p.date.toLocaleDateString('en-GB'),
                House: house?.name || 'Unknown',
                Amount: p.amount,
                Method: p.method,
                Collector: 'Collector'
            };
        });
        exportToCSV(data, ['Date', 'House', 'Amount', 'Method', 'Collector'], 'Payment_Report');
    };

    const handleExportHouses = () => {
        if (!context) return;
        const data = context.houses.map(h => {
            const loc = context.locations.find(l => l.id === h.locationId);
            // Format months list
            const monthsStr = h.unpaidMonths && h.unpaidMonths.length > 0 ? h.unpaidMonths.join(', ') : 'None';
            
            return {
                Name: h.name,
                Location: loc?.name || '',
                Status: h.tenantId ? 'Rented' : 'Vacant',
                RentAmount: h.rentAmount,
                DueAmount: h.dueAmount,
                UnpaidMonths: monthsStr
            };
        });
        exportToCSV(data, ['Name', 'Location', 'Status', 'Rent', 'Due', 'Months Due'], 'Properties_Report');
    };

    const handleSharePaymentsPDF = () => {
        if (!context) return;
        const head = [['Date', 'Unit Name', 'Amount (SAR)', 'Method']];
        const body = context.payments.map(p => {
            const house = context.houses.find(h => h.id === p.houseId);
            return [
                p.date.toLocaleDateString('en-GB'),
                house?.name || '-',
                p.amount.toLocaleString(),
                p.method
            ];
        });
        sharePDF('Payments Report', head, body, 'payments_report');
    };

    const handleSharePropertiesPDF = () => {
        if (!context) return;
        const head = [['Unit', 'Status', 'Rent', 'Due', 'Unpaid Months']];
        const body = context.houses.map(h => [
            h.name,
            h.tenantId ? 'Rented' : 'Vacant',
            h.rentAmount.toLocaleString(),
            h.dueAmount.toLocaleString(),
            h.unpaidMonths && h.unpaidMonths.length > 0 ? h.unpaidMonths.join(', ') : '-'
        ]);
        sharePDF('Properties Status Report', head, body, 'properties_report');
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">ملخص الأعمال اليوم</h2>
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">{new Date().toLocaleDateString('en-GB')}</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatBox label="إجمالي المحصل" value={`${stats.totalCollected.toLocaleString()} ر.س`} color="blue" />
                <StatBox label="إجمالي المستحق" value={`${stats.totalDue.toLocaleString()} ر.س`} color="red" />
                <StatBox label="عقارات مؤجرة" value={stats.rentedCount} color="green" />
                <StatBox label="عقارات شاغرة" value={stats.vacantCount} color="yellow" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card title="آخر المدفوعات المستلمة">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="text-gray-400 text-xs uppercase border-b">
                                    <tr>
                                        <th className="pb-3">الشقة</th>
                                        <th className="pb-3">المبلغ</th>
                                        <th className="pb-3">التاريخ</th>
                                        <th className="pb-3">المحصل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {context?.payments.slice(-5).reverse().map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 font-medium">{context.houses.find(h => h.id === p.houseId)?.name}</td>
                                            <td className="py-4 text-green-600 font-bold">{p.amount.toLocaleString()} ريال</td>
                                            <td className="py-4 text-xs text-gray-500">{p.date.toLocaleDateString('en-GB')}</td>
                                            <td className="py-4 text-xs">أحمد (محصل 1)</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                
                <div className="lg:col-span-1">
                    <Card title="مركز التقارير (Excel & PDF)" className="h-full flex flex-col justify-center">
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 mb-4">تصدير البيانات أو مشاركتها عبر واتساب (PDF).</p>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={handleExportPayments} variant="secondary" className="text-xs px-2" title="تصدير Excel">
                                    <DownloadIcon className="w-4 h-4"/> سجل المدفوعات
                                </Button>
                                <Button onClick={handleSharePaymentsPDF} className="bg-green-600 hover:bg-green-700 text-xs px-2" title="مشاركة واتساب">
                                    <WhatsAppIcon className="w-4 h-4"/> مشاركة PDF
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={handleExportHouses} variant="secondary" className="text-xs px-2" title="تصدير Excel">
                                    <DownloadIcon className="w-4 h-4"/> حالة العقارات
                                </Button>
                                <Button onClick={handleSharePropertiesPDF} className="bg-green-600 hover:bg-green-700 text-xs px-2" title="مشاركة واتساب">
                                    <WhatsAppIcon className="w-4 h-4"/> مشاركة PDF
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, color }: any) => {
    const colors: any = {
        blue: 'from-blue-500 to-blue-700',
        red: 'from-red-500 to-red-700',
        green: 'from-green-500 to-green-700',
        yellow: 'from-yellow-500 to-yellow-700',
    };
    return (
        <div className={`p-6 rounded-2xl bg-gradient-to-br ${colors[color]} text-white shadow-xl transform transition hover:-translate-y-1`}>
            <p className="text-xs opacity-80 mb-1">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
};

const PropertyManagementScreen = () => {
    const context = useContext(AppDataContext);
    const [selectedLoc, setSelectedLoc] = useState('');
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isLocationModalOpen, setLocationModalOpen] = useState(false);
    
    // Form state for new house
    const [houseName, setHouseName] = useState('');
    const [locationId, setLocationId] = useState('');
    const [rentAmount, setRentAmount] = useState('');

    // Form state for new location
    const [newLocationName, setNewLocationName] = useState('');

    const filteredHouses = context?.houses.filter(h => !selectedLoc || h.locationId === selectedLoc);

    const handleAddHouse = () => {
        if (!houseName || !locationId || !rentAmount) {
             alert("الرجاء تعبئة جميع البيانات (الاسم، الموقع، الإيجار)");
             return;
        }

        context?.addHouse({
            name: houseName,
            locationId: locationId,
            rentAmount: parseFloat(rentAmount)
        });

        setAddModalOpen(false);
        // Reset form
        setHouseName('');
        setLocationId('');
        setRentAmount('');
        alert("تم إضافة العقار بنجاح");
    };

    const handleAddLocation = () => {
        if (!newLocationName.trim()) {
            alert("الرجاء إدخال اسم الموقع");
            return;
        }
        context?.addLocation(newLocationName);
        setNewLocationName('');
        // We keep the modal open to allow adding more or deleting existing
        alert("تم إضافة الموقع بنجاح");
    };

    const handleDeleteLocation = (id: string) => {
        if (confirm("هل أنت متأكد من حذف هذا الموقع؟")) {
            context?.deleteLocation(id);
        }
    };

    const handleDeleteHouse = (id: string) => {
        if (confirm("هل أنت متأكد من حذف هذا العقار؟")) {
            context?.deleteHouse(id);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">إدارة العقارات</h2>
                <div className="flex gap-4">
                    <Select label="" value={selectedLoc} onChange={e => setSelectedLoc(e.target.value)}>
                        <option value="">كل المناطق</option>
                        {context?.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </Select>
                    <Button onClick={() => setLocationModalOpen(true)} variant="secondary">إدارة المواقع</Button>
                    <Button onClick={() => setAddModalOpen(true)} variant="primary">إضافة عقار +</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHouses?.map(house => (
                    <Card key={house.id} className="flex justify-between items-center border-l-4 border-gray-300">
                        <div className="flex-1">
                            <p className="font-bold text-lg">{house.name}</p>
                            <p className="text-xs text-gray-500">{context.locations.find(l=>l.id===house.locationId)?.name}</p>
                            {house.unpaidMonths && house.unpaidMonths.length > 0 && (
                                <p className="text-[10px] text-red-500 mt-1 font-bold">
                                    مستحق: {house.unpaidMonths.slice(0, 3).join(', ')}{house.unpaidMonths.length > 3 ? '...' : ''}
                                </p>
                            )}
                        </div>
                        <div className="text-left flex flex-col items-end gap-2">
                            <div>
                                <p className="text-xs text-gray-400">الإيجار</p>
                                <p className="font-bold text-blue-600">{house.rentAmount.toLocaleString()} ريال</p>
                            </div>
                            <button onClick={() => handleDeleteHouse(house.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors" title="حذف العقار">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="إضافة وحدة عقارية جديدة">
                <div className="space-y-4">
                    <Input 
                        label="اسم الوحدة (مثال: شقة 5، محل 3)" 
                        value={houseName} 
                        onChange={e => setHouseName(e.target.value)} 
                        placeholder="اسم الوحدة"
                    />
                    <Select label="الموقع / المبنى" value={locationId} onChange={e => setLocationId(e.target.value)}>
                        <option value="">اختر الموقع...</option>
                        {context?.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </Select>
                    <Input 
                        label="قيمة الإيجار الافتراضية" 
                        type="number" 
                        value={rentAmount} 
                        onChange={e => setRentAmount(e.target.value)} 
                        placeholder="0"
                    />
                    <Button onClick={handleAddHouse} className="w-full" variant="success">حفظ العقار</Button>
                </div>
            </Modal>

            <Modal isOpen={isLocationModalOpen} onClose={() => setLocationModalOpen(false)} title="إدارة المواقع / المباني">
                <div className="space-y-6">
                    <div className="space-y-2 border-b pb-6">
                        <Input 
                            label="إضافة موقع جديد" 
                            value={newLocationName} 
                            onChange={e => setNewLocationName(e.target.value)} 
                            placeholder="مثال: مجمع العليا السكني"
                        />
                        <Button onClick={handleAddLocation} className="w-full" variant="success">حفظ الموقع الجديد</Button>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-700 mb-3">قائمة المواقع الحالية</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {context?.locations.map(loc => (
                                <div key={loc.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="font-medium text-gray-700">{loc.name}</span>
                                    <button 
                                        onClick={() => handleDeleteLocation(loc.id)} 
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                                        title="حذف الموقع"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                            {context?.locations.length === 0 && <p className="text-gray-400 text-sm text-center">لا توجد مواقع مضافة</p>}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ApprovalsScreen = () => {
    const context = useContext(AppDataContext);
    const pendingLease = context?.leaseRequests.filter(r => r.status === 'pending') || [];
    const pendingVacate = context?.vacateRequests.filter(r => r.status === 'pending') || [];
    const [viewVideoUrl, setViewVideoUrl] = useState<string | null>(null);

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Lease Requests */}
            {pendingLease.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-600 p-1 rounded">عقود</span>
                        طلبات تأجير جديدة
                    </h2>
                    <div className="grid gap-4">
                        {pendingLease.map(req => (
                            <Card key={req.id} className="flex items-center justify-between shadow-md border-r-4 border-blue-500">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-100 p-3 rounded-full text-blue-600"><UserIcon /></div>
                                    <div>
                                        <p className="font-bold">{req.tenantName}</p>
                                        <p className="text-xs text-gray-500">طلب استئجار: {context?.houses.find(h=>h.id===req.houseId)?.name}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="danger" onClick={() => context?.rejectLeaseRequest(req.id)}><XCircleIcon className="w-4 h-4"/> رفض</Button>
                                    <Button variant="success" onClick={() => context?.approveLeaseRequest(req.id)}><CheckCircleIcon className="w-4 h-4"/> اعتماد</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Vacate Requests */}
            {pendingVacate.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                         <span className="bg-red-100 text-red-600 p-1 rounded">إخلاء</span>
                         طلبات إخلاء ومراجعة الفيديو
                    </h2>
                    <div className="grid gap-4">
                        {pendingVacate.map(req => {
                            const house = context?.houses.find(h=>h.id===req.houseId);
                            const tenant = context?.tenants.find(t=>t.id===req.tenantId);
                            return (
                                <Card key={req.id} className="shadow-md border-r-4 border-red-500">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="bg-red-100 p-3 rounded-full text-red-600"><HomeIcon /></div>
                                            <div>
                                                <p className="font-bold text-lg">{house?.name}</p>
                                                <p className="text-sm text-gray-600">المستأجر: {tenant?.name}</p>
                                                <p className="text-xs text-gray-400">{req.date.toLocaleString('en-GB')}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <Button onClick={() => setViewVideoUrl(req.videoDataUrl)} className="bg-gray-800 text-white hover:bg-black">
                                                مشاهدة الفيديو
                                            </Button>
                                            <div className="h-8 w-px bg-gray-300 mx-2"></div>
                                            <Button variant="danger" onClick={() => context?.rejectVacateRequest(req.id)}>رفض الإخلاء</Button>
                                            <Button variant="success" onClick={() => context?.approveVacateRequest(req.id)}>إتمام الإخلاء</Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {pendingLease.length === 0 && pendingVacate.length === 0 && (
                <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-200">
                    <CheckCircleIcon className="w-16 h-16 text-green-100 mx-auto mb-4"/>
                    <p className="text-gray-400 text-lg">لا توجد طلبات معلقة حالياً</p>
                </div>
            )}

            <Modal isOpen={!!viewVideoUrl} onClose={() => setViewVideoUrl(null)} title="مراجعة فيديو الإخلاء">
                <div className="bg-black rounded-lg overflow-hidden">
                    {viewVideoUrl && (
                        <video src={viewVideoUrl} controls autoPlay className="w-full max-h-[60vh]" />
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={() => setViewVideoUrl(null)} variant="secondary">إغلاق</Button>
                </div>
            </Modal>
        </div>
    );
};

const CashHandoverScreen = () => {
    const context = useContext(AppDataContext);
    const [amount, setAmount] = useState(0);

    const handleExport = () => {
        if (!context) return;
        const data = context.handovers.map(h => ({
            Date: h.date.toLocaleDateString('en-GB'),
            Amount: h.amount,
            Collector: 'Collector 1' 
        }));
        exportToCSV(data, ['Date', 'Amount', 'Collector'], 'Cash_Handovers');
    };

    const handleShare = () => {
        if (!context) return;
        const head = [['Date', 'Amount (SAR)', 'Collector']];
        const body = context.handovers.map(h => [
            h.date.toLocaleDateString('en-GB'),
            h.amount.toLocaleString(),
            'Collector 1'
        ]);
        sharePDF('Cash Handovers Report', head, body, 'cash_handovers');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold">تسليم المبالغ النقدية</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="تسجيل عملية استلام">
                    <Input label="المبلغ المستلم من المحصل" type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
                    <Button className="w-full mt-4" onClick={() => {
                        if(amount > 0) { context?.addCashHandover(amount); setAmount(0); alert("تم الحفظ"); }
                    }}>تأكيد استلام المبلغ</Button>
                </Card>
                <Card>
                     <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h2 className="text-xl font-bold text-gray-800">تاريخ التسليمات</h2>
                        <div className="flex gap-2">
                             <button onClick={handleExport} className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors" title="تصدير Excel">
                                <DownloadIcon className="w-5 h-5"/>
                             </button>
                             <button onClick={handleShare} className="p-1 rounded-full hover:bg-green-50 text-green-600 transition-colors" title="مشاركة واتساب">
                                <WhatsAppIcon className="w-5 h-5"/>
                             </button>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {context?.handovers.slice().reverse().map(h => (
                            <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-bold">{h.amount.toLocaleString()} ريال</span>
                                <span className="text-xs text-gray-400">{h.date.toLocaleDateString('en-GB')}</span>
                            </div>
                        ))}
                         {context?.handovers.length === 0 && <p className="text-gray-400 text-center py-4">لا توجد سجلات</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ManagerDashboard;
