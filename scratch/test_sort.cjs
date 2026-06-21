const staff = [
  { id: "e40ce95e-8d99-40ae-b546-75204d0136f8", name: "José", role: "Barbero" },
  { id: "936116a5-775c-48ec-a348-1efe2d2013b8", name: "Marco", role: "Barbero" },
  { id: "a2352a37-1dcb-4710-99fe-b3af29bbc5bb", name: "Luis", role: "Barbero" }
];

const turnQueue = [
  { staff_id: "e40ce95e-8d99-40ae-b546-75204d0136f8", position: 1, status: "BUSY" },
  { staff_id: "936116a5-775c-48ec-a348-1efe2d2013b8", position: 2, status: "AVAILABLE" },
  { staff_id: "a2352a37-1dcb-4710-99fe-b3af29bbc5bb", position: 3, status: "AVAILABLE" }
];

const activeAppointments = [
  { staff_id: "e40ce95e-8d99-40ae-b546-75204d0136f8", status: "En Silla", started_at: new Date().toISOString() }
];

const getQueuePosition = (staffId) => {
  const entry = turnQueue.find(q => q.staff_id === staffId);
  return entry ? entry.position : 9999;
};

const checkedInStaff = staff
  .filter(s => turnQueue.some(q => q.staff_id === s.id && q.status !== 'ABSENT'))
  .sort((a, b) => {
    const aBusy = activeAppointments.some(appt => appt.staff_id === a.id);
    const bBusy = activeAppointments.some(appt => appt.staff_id === b.id);
    
    if (aBusy && !bBusy) return 1;  // Busy goes last
    if (!aBusy && bBusy) return -1; // Available goes first
    
    return getQueuePosition(a.id) - getQueuePosition(b.id);
  });

console.log("Sorted checkedInStaff:", checkedInStaff.map(s => s.name));
