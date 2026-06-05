async function runTest() {
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwQ3ro99kB2GUSTvM1lZIGTIFqxYQSWelgTxOLacz9bUMa2t44IyhhaTubOwUDXMgAM/exec";
  const payload = {
    fecha: new Date().toLocaleDateString('es-VE'),
    cliente: "Test 11 Cols",
    cedula: "30102609",
    barbero: "Aidan",
    servicio: "Corte Basico",
    metodoPago: "Efectivo ($)",
    lavado: 1,
    montoBs: "5.800,00Bs.",
    montoUsd: "10,00$",
    tasa: "58,00Bs./$"
  };

  console.log("Sending payload:", payload);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    console.log("Redirected:", res.redirected);
    
    const text = await res.text();
    console.log("Response Body:", text);
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

runTest();
