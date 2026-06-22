import React from 'react';

const ReceiptTicket = ({ transaction }) => {
  if (!transaction) return null;

  const { client, staff, items, paymentMethods, subtotal, discount, tip, total, generated_at } = transaction;

  return (
    <div className="receipt-ticket">
      {/* HEADER */}
      <div className="receipt-header">
        <h2 className="receipt-title">PANDA BARBER STUDIO</h2>
        <p>RIF: J-50478148-3</p>
        <p>C.C. Global, Nivel 1, Local 81</p>
        <p>Maracay, Aragua</p>
        <p>Tel: +58 424-3002338</p>
        <p>IG: @pandabarberstudio_</p>
        <div className="receipt-divider">================================</div>
      </div>

      {/* INFO */}
      <div className="receipt-info">
        <p><strong>Fecha:</strong> {new Date(generated_at || Date.now()).toLocaleString()}</p>
        {client && <p><strong>Cliente:</strong> {client.name}</p>}
        {staff && <p><strong>Atendido por:</strong> {staff.name}</p>}
        <div className="receipt-divider">================================</div>
      </div>

      {/* ITEMS */}
      <div className="receipt-items">
        <table className="receipt-table">
          <thead>
            <tr>
              <th className="text-left">CANT</th>
              <th className="text-left">DESCRIPCIÓN</th>
              <th className="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items && items.map((item, index) => (
              <tr key={index}>
                <td className="text-left">{item.quantity || 1}</td>
                <td className="text-left">{item.name}</td>
                <td className="text-right">${Number(item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="receipt-divider">--------------------------------</div>
      </div>

      {/* TOTALS */}
      <div className="receipt-totals">
        <div className="receipt-row">
          <span>Subtotal:</span>
          <span>${Number(subtotal || 0).toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="receipt-row">
            <span>Descuento:</span>
            <span>-${Number(discount).toFixed(2)}</span>
          </div>
        )}
        {tip > 0 && (
          <div className="receipt-row">
            <span>Propina (Barbero):</span>
            <span>${Number(tip).toFixed(2)}</span>
          </div>
        )}
        <div className="receipt-row receipt-grand-total">
          <span>TOTAL A PAGAR:</span>
          <span>${Number(total || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className="receipt-divider">================================</div>

      {/* PAYMENT METHODS */}
      <div className="receipt-payments">
        <p className="receipt-subtitle">MÉTODOS DE PAGO</p>
        {paymentMethods && paymentMethods.map((pm, i) => (
          <div className="receipt-row" key={i}>
            <span>{pm.method}:</span>
            <span>${Number(pm.amount).toFixed(2)}</span>
          </div>
        ))}
        {transaction.change > 0 && (
          <div className="receipt-row receipt-change">
            <span>Cambio / Vuelto:</span>
            <span>${Number(transaction.change).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="receipt-footer">
        <div className="receipt-divider">================================</div>
        <p className="receipt-thanks">¡GRACIAS POR TU VISITA!</p>
        <p className="receipt-slogan">Tu estilo, nuestra pasión.</p>
        <p style={{marginTop: '10px', fontSize: '10px'}}>Software by Antigravity CRM</p>
      </div>
    </div>
  );
};

export default ReceiptTicket;
