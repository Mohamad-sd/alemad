
import React, { useState, useContext, useRef, useCallback, useEffect } from 'react';
import { AppDataContext } from '../../App';
import { House, PaymentMethod, NewLeaseRequest } from '../../types';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Input from '../shared/Input';
import Select from '../shared/Select';
import Modal from '../shared/Modal';
import HomeIcon from '../icons/HomeIcon';
import ReportIcon from '../icons/ReportIcon';
import BuildingIcon from '../icons/BuildingIcon';
import WhatsAppIcon from '../icons/WhatsAppIcon';
import UserIcon from '../icons/UserIcon';
import DollarSignIcon from '../icons/DollarSignIcon';

type CollectorView = 'collection' | 'vacant' | 'reports';

const CollectorDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<CollectorView>('collection');
  const context = useContext(AppDataContext);
  
  if (!context || !context.isLoaded) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;

  const renderCurrentView = () => {
    switch (currentView) {
      case 'collection': return <CollectionScreen />;
      case 'vacant': return <VacantHousesScreen />;
      case 'reports': return <CollectorReports />;
      default: return <CollectionScreen />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
            <BuildingIcon className="w-8 h-8" />
            <h1 className="text-xl font-bold">بوابة المحصل</h1>
        </div>
        <button onClick={onLogout} className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-all">خروج</button>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        {renderCurrentView()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <NavButton active={currentView === 'collection'} onClick={() => setCurrentView('collection')} icon={<DollarSignIcon />} label="التحصيل" />
        <NavButton active={currentView === 'vacant'} onClick={() => setCurrentView('vacant')} icon={<HomeIcon />} label="العقارات" />
        <NavButton active={currentView === 'reports'} onClick={() => setCurrentView('reports')} icon={<ReportIcon />} label="التقارير" />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-600' : 'text-gray-400'}`}>
        {icon}
        <span className="text-xs font-bold">{label}</span>
    </button>
);

const CollectionScreen = () => {
    const context = useContext(AppDataContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

    const filteredHouses = (context?.houses || []).filter(h => {
        const matchesLocation = !selectedLocation || h.locationId === selectedLocation;
        const matchesSearch = h.name.includes(searchTerm) || (context?.tenants.find(t => t.id === h.tenantId)?.name || '').includes(searchTerm);
        return h.tenantId && matchesLocation && matchesSearch;
    });

    const handleHouseSelect = (house: House) => {
        setSelectedHouse(house);
        setPaymentAmount(house.dueAmount);
    };
    
    const handleAddPayment = () => {
        if (selectedHouse && paymentAmount > 0) {
            context?.addPayment({
                houseId: selectedHouse.id,
                amount: paymentAmount,
                method: paymentMethod,
            });
            setPaymentModalOpen(false);
            setSelectedHouse(null);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <Card className="border-r-4 border-blue-600">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input label="البحث عن شقة أو مستأجر" placeholder="اكتب الاسم هنا..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="w-full md:w-64">
                        <Select label="تصفية حسب الموقع" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                            <option value="">كل المواقع</option>
                            {context?.locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </Select>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHouses.map(house => (
                    <button key={house.id} onClick={() => handleHouseSelect(house)} className={`p-5 rounded-xl text-right transition-all border-2 flex flex-col gap-2 ${selectedHouse?.id === house.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-white bg-white hover:border-blue-200'}`}>
                        <div className="flex justify-between items-start">
                             <h3 className="font-bold text-lg text-gray-800">{house.name}</h3>
                             {house.dueAmount > 0 ? <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">مطلوب سداد</span> : <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">مسدد</span>}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1"><UserIcon className="w-3 h-3" /> {context?.tenants.find(t => t.id === house.tenantId)?.name}</p>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                            <span className="text-xs text-gray-400">المبلغ المستحق:</span>
                            <span className="font-bold text-blue-700">{house.dueAmount.toLocaleString()} ريال</span>
                        </div>
                    </button>
                ))}
                {filteredHouses.length === 0 && <div className="col-span-full py-12 text-center text-gray-400">لا توجد نتائج مطابقة</div>}
            </div>

            {selectedHouse && (
                <div className="fixed bottom-24 left-4 right-4 animate-slideUp">
                    <Card className="bg-blue-600 text-white shadow-2xl flex items-center justify-between p-4">
                        <div>
                            <p className="text-xs opacity-80">تحصيل من: {selectedHouse.name}</p>
                            <p className="font-bold">{selectedHouse.dueAmount.toLocaleString()} ريال</p>
                        </div>
                        <Button variant="success" onClick={() => setPaymentModalOpen(true)} className="bg-white text-blue-600 hover:bg-gray-100">تسجيل دفعة</Button>
                    </Card>
                </div>
            )}
            
            <Modal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="إكمال عملية التحصيل">
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                         <p className="text-sm text-blue-800 font-bold">المبلغ المتبقي على المستأجر: {selectedHouse?.dueAmount.toLocaleString()} ريال</p>
                    </div>
                    <Input label="المبلغ المستلم الآن" type="number" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))}/>
                    <Select label="طريقة الاستلام" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                        <option value={PaymentMethod.CASH}>نقدي (كاش)</option>
                        <option value={PaymentMethod.BANK_TRANSFER}>تحويل بنكي</option>
                    </Select>
                    <Button onClick={handleAddPayment} className="w-full py-3 text-lg" variant="success">تأكيد الاستلام</Button>
                </div>
            </Modal>
        </div>
    );
};

const VacantHousesScreen = () => {
    const context = useContext(AppDataContext);
    const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
    const [isNewLeaseModalOpen, setNewLeaseModalOpen] = useState(false);
    const [isVacateModalOpen, setVacateModalOpen] = useState(false);
    const [timer, setTimer] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => setTimer(t => t + 1), 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    const handleVacateClick = (house: House) => {
        setSelectedHouse(house);
        setRecordedBlob(null);
        setVacateModalOpen(true);
        startCamera();
    };

    const startCamera = async () => {
        try {
            // Try to get rear camera
            const constraints = { 
                video: { facingMode: "environment" },
                audio: true 
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if(videoRef.current) {
                videoRef.current.srcObject = stream;
                // Prepare MediaRecorder
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunksRef.current.push(e.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                    setRecordedBlob(blob);
                };
            }
        } catch (e) {
            console.error(e);
            alert("يرجى تفعيل صلاحية الكاميرا. تأكد من أنك تستخدم جهازاً يحتوي على كاميرا.");
        }
    };

    const toggleRecording = () => {
        if (!mediaRecorderRef.current) return;

        if (isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        } else {
            mediaRecorderRef.current.start();
            setIsRecording(true);
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
        setIsRecording(false);
    };

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleSendVacateRequest = async () => {
        if (selectedHouse && selectedHouse.tenantId && recordedBlob) {
            try {
                // Check blob size - simplistic check for demo
                if (recordedBlob.size > 5 * 1024 * 1024) {
                    // Warning for demo purposes
                    if(!confirm("حجم الفيديو كبير وقد يستغرق وقتاً. هل تود المتابعة؟")) return;
                }

                const base64Video = await blobToBase64(recordedBlob);
                
                await context?.requestVacation({
                    houseId: selectedHouse.id,
                    tenantId: selectedHouse.tenantId,
                    videoDataUrl: base64Video,
                    note: 'تم توثيق حالة المنزل عند الإخلاء'
                });

                stopCamera();
                setVacateModalOpen(false);
                alert("تم إرسال الفيديو وطلب الإخلاء للمدير للموافقة.");
            } catch (e) {
                alert("حدث خطأ أثناء معالجة الفيديو. حاول تسجيل فيديو أقصر.");
            }
        } else {
            alert("يرجى تسجيل الفيديو أولاً.");
        }
    };

    const pendingHouseIds = context?.vacateRequests.filter(v => v.status === 'pending').map(v => v.houseId) || [];

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><HomeIcon className="w-5 h-5 text-green-600"/> منازل فارغة (للتأجير)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {context?.houses.filter(h => !h.tenantId).map(house => (
                        <Card key={house.id} className="border-t-4 border-green-500">
                            <h3 className="font-bold text-lg">{house.name}</h3>
                            <p className="text-xs text-gray-500 mb-4">{context.locations.find(l=>l.id === house.locationId)?.name}</p>
                            <Button onClick={() => { setSelectedHouse(house); setNewLeaseModalOpen(true); }} className="w-full" variant="success">تأجير جديد</Button>
                        </Card>
                    ))}
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><HomeIcon className="w-5 h-5 text-red-600"/> منازل مؤجرة (للإخلاء)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {context?.houses.filter(h => h.tenantId).map(house => {
                        const isPending = pendingHouseIds.includes(house.id);
                        return (
                            <Card key={house.id} className="border-t-4 border-red-500">
                                <h3 className="font-bold text-lg">{house.name}</h3>
                                <p className="text-xs text-gray-500 mb-4">{context.tenants.find(t => t.id === house.tenantId)?.name}</p>
                                {isPending ? (
                                    <div className="bg-yellow-100 text-yellow-700 text-center py-2 rounded-md text-sm font-bold">
                                        جاري مراجعة الإخلاء...
                                    </div>
                                ) : (
                                    <Button onClick={() => handleVacateClick(house)} className="w-full" variant="danger">توثيق إخلاء (فيديو)</Button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </div>

            <NewLeaseModal isOpen={isNewLeaseModalOpen} onClose={() => setNewLeaseModalOpen(false)} house={selectedHouse} />

            <Modal isOpen={isVacateModalOpen} onClose={() => { stopCamera(); setVacateModalOpen(false); }} title="توثيق الإخلاء بالفيديو">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">سيتم استخدام الكاميرا الخلفية. قم بتسجيل جولة سريعة.</p>
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
                        {!recordedBlob ? (
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        ) : (
                            <video src={URL.createObjectURL(recordedBlob)} controls className="w-full h-full object-contain bg-black" />
                        )}

                        {isRecording && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full text-white">
                                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                                <span className="text-xs font-mono">{Math.floor(timer/60)}:{(timer%60).toString().padStart(2,'0')}</span>
                            </div>
                        )}
                    </div>
                    
                    {!recordedBlob ? (
                        <Button 
                            onClick={toggleRecording} 
                            className={`w-full py-4 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button onClick={() => { setRecordedBlob(null); startCamera(); }} variant="secondary" className="flex-1">إعادة التسجيل</Button>
                            <Button onClick={handleSendVacateRequest} variant="danger" className="flex-1">إرسال للمدير</Button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

// ... (NewLeaseModal logic is similar but polished) ...
const NewLeaseModal = ({ isOpen, onClose, house }: any) => {
    const context = useContext(AppDataContext);
    const [name, setName] = useState('');
    const [idNum, setIdNum] = useState('');
    const [rent, setRent] = useState(house?.rentAmount || 0);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleSubmit = () => {
        if (!name || !idNum) return alert("يرجى إكمال البيانات");
        context?.addLeaseRequest({
            houseId: house.id,
            tenantName: name,
            tenantIdNumber: idNum,
            tenantIdPhoto: new File([], 'fake.jpg'),
            rentAmount: rent,
            signatureDataUrl: canvasRef.current?.toDataURL() || '',
        });
        onClose();
        alert("تم إرسال الطلب للمدير للمراجعة.");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`عقد جديد - ${house?.name}`}>
            <div className="space-y-4">
                <Input label="اسم المستأجر الكامل" value={name} onChange={e => setName(e.target.value)} />
                <Input label="رقم الهوية / الإقامة" value={idNum} onChange={e => setIdNum(e.target.value)} />
                <Input label="الإيجار المتفق عليه" type="number" value={rent} onChange={e => setRent(parseFloat(e.target.value))} />
                <div>
                    <label className="block text-sm font-bold mb-1">توقيع المستأجر (باللمس)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 h-32 relative overflow-hidden">
                         <canvas ref={canvasRef} width="400" height="120" className="w-full h-full cursor-crosshair" onTouchMove={(e) => {
                             const ctx = canvasRef.current?.getContext('2d');
                             if (!ctx) return;
                             const rect = canvasRef.current!.getBoundingClientRect();
                             const touch = e.touches[0];
                             ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                             ctx.stroke();
                         }} onTouchStart={(e) => {
                             const ctx = canvasRef.current?.getContext('2d');
                             if (!ctx) return;
                             ctx.beginPath();
                             const rect = canvasRef.current!.getBoundingClientRect();
                             const touch = e.touches[0];
                             ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                         }} />
                    </div>
                </div>
                <Button onClick={handleSubmit} className="w-full" variant="success">إرسال للمدير</Button>
            </div>
        </Modal>
    );
};

const CollectorReports = () => {
    const context = useContext(AppDataContext);
    const totalCollected = (context?.payments || []).reduce((s, p) => s + p.amount, 0);

    return (
        <div className="space-y-6 animate-fadeIn">
            <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
                <p className="text-sm opacity-80">إجمالي تحصيلاتك اليوم</p>
                <h3 className="text-3xl font-bold">{totalCollected.toLocaleString()} ريال</h3>
            </Card>

            <Card title="آخر العمليات">
                <div className="space-y-3">
                    {context?.payments.slice(-5).reverse().map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-bold text-sm">{context.houses.find(h => h.id === p.houseId)?.name}</p>
                                <p className="text-[10px] text-gray-400">{p.date.toLocaleString('en-GB')}</p>
                            </div>
                            <span className="font-bold text-green-600">+{p.amount}</span>
                        </div>
                    ))}
                    {context?.payments.length === 0 && <p className="text-center text-gray-400 text-sm py-4">لا توجد عمليات بعد</p>}
                </div>
            </Card>
        </div>
    );
};

export default CollectorDashboard;
