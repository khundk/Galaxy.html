export interface WarehouseAddress {
  name: string;
  contactName: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface CustomerAddress {
  name?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface OutboundLabel {
  trackingNumber: string;
  carrier: string;
  service: string;
  labelUrl: string;
  cost: number;
}

export async function createOutboundLabel(
  customerAddress: CustomerAddress,
  weightKg: number,
  orderRef: string,
  options: {
    carrier: string;
    serviceCode?: string;
    shipstationApiKey?: string;
    shipstationApiSecret?: string;
    shippoApiToken?: string;
  }
): Promise<OutboundLabel> {
  if (options.carrier === 'shipstation' && options.shipstationApiKey && options.shipstationApiSecret) {
    return createShipStationLabel(customerAddress, weightKg, orderRef, {
      shipstationApiKey: options.shipstationApiKey,
      shipstationApiSecret: options.shipstationApiSecret,
      serviceCode: options.serviceCode,
    });
  }

  if (options.carrier === 'shippo' && options.shippoApiToken) {
    return createShippoLabel(customerAddress, weightKg, orderRef, options.shippoApiToken);
  }

  // Demo mode — simulates label creation without manual address entry
  const trackingNumber = `SB${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  return {
    trackingNumber,
    carrier: 'USPS',
    service: 'Priority Mail',
    labelUrl: `/api/labels/${orderRef}.pdf`,
    cost: Math.round((4.5 + weightKg * 2.5) * 100) / 100,
  };
}

async function createShipStationLabel(
  address: CustomerAddress,
  weightKg: number,
  orderRef: string,
  options: { shipstationApiKey: string; shipstationApiSecret: string; serviceCode?: string }
): Promise<OutboundLabel> {
  const auth = Buffer.from(`${options.shipstationApiKey}:${options.shipstationApiSecret}`).toString('base64');

  const response = await fetch('https://ssapi.shipstation.com/orders/createorder', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderNumber: orderRef,
      orderStatus: 'awaiting_shipment',
      shipTo: {
        name: address.name || 'Customer',
        street1: address.address1,
        street2: address.address2 || '',
        city: address.city,
        state: address.province || '',
        postalCode: address.zip,
        country: address.country,
        phone: address.phone || '',
      },
      weight: { value: weightKg * 35.274, units: 'ounces' },
    }),
  });

  if (!response.ok) {
    throw new Error(`ShipStation order create failed: ${await response.text()}`);
  }

  const orderData = (await response.json()) as { orderId: number };

  const labelResponse = await fetch('https://ssapi.shipstation.com/orders/createlabelfororder', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId: orderData.orderId,
      carrierCode: 'usps',
      serviceCode: options.serviceCode || 'usps_priority_mail',
      packageCode: 'package',
      confirmation: 'delivery',
      weight: { value: weightKg * 35.274, units: 'ounces' },
    }),
  });

  if (!labelResponse.ok) {
    throw new Error(`ShipStation label create failed: ${await labelResponse.text()}`);
  }

  const label = (await labelResponse.json()) as {
    trackingNumber: string;
    shipmentCost: number;
    labelData?: string;
  };

  return {
    trackingNumber: label.trackingNumber,
    carrier: 'USPS',
    service: options.serviceCode || 'usps_priority_mail',
    labelUrl: label.labelData ? `data:application/pdf;base64,${label.labelData}` : '',
    cost: label.shipmentCost,
  };
}

async function createShippoLabel(
  address: CustomerAddress,
  weightKg: number,
  orderRef: string,
  apiToken: string
): Promise<OutboundLabel> {
  const response = await fetch('https://api.goshippo.com/transactions/', {
    method: 'POST',
    headers: {
      Authorization: `ShippoToken ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shipment: {
        address_to: {
          name: address.name || 'Customer',
          street1: address.address1,
          street2: address.address2 || '',
          city: address.city,
          state: address.province || '',
          zip: address.zip,
          country: address.country,
          phone: address.phone || '',
        },
        parcels: [{ weight: String(weightKg), mass_unit: 'kg' }],
      },
      async: false,
      metadata: orderRef,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shippo label create failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    tracking_number: string;
    label_url: string;
    rate?: { amount: string; provider: string; servicelevel?: { name: string } };
  };

  return {
    trackingNumber: data.tracking_number,
    carrier: data.rate?.provider || 'Shippo',
    service: data.rate?.servicelevel?.name || 'Standard',
    labelUrl: data.label_url,
    cost: parseFloat(data.rate?.amount || '0'),
  };
}
