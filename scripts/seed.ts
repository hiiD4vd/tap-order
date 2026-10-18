import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed ini MENGHAPUS SEMUA DATA (deleteMany di bawah). Di produksi itu
  // bencana, jadi wajib opt-in eksplisit lewat FORCE_SEED=1.
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== '1') {
    console.error(
      'DITOLAK: seed menghapus seluruh data dan NODE_ENV=production.\n' +
        'Kalau benar-benar ingin, jalankan ulang dengan FORCE_SEED=1.'
    );
    process.exit(1);
  }

  console.log('Seeding Tap-Order database...');

  // 1. Clear existing data
  await prisma.auditLog.deleteMany({});
  await prisma.tableRequest.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.optionChoice.deleteMany({});
  await prisma.optionGroup.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.table.deleteMany({});
  await prisma.venue.deleteMany({});

  // 2. Create Venue: Kopi Senja & Eatery
  const senja = await prisma.venue.create({
    data: {
      name: 'Kopi Senja & Eatery',
      slug: 'kopi-senja',
      phone: '081234567890',
      whatsapp: '6281234567890',
      address: 'Jl. Melati No. 45, Jakarta Selatan',
      currency: 'IDR',
      subscriptionTier: 'pro',
      pinCashier: '1234',
    },
  });

  // 3. Create Tables for Kopi Senja
  const tableData = [
    { number: '01', cardToken: 'SNJ001', label: 'Indoor AC' },
    { number: '02', cardToken: 'SNJ002', label: 'Indoor AC' },
    { number: '03', cardToken: 'SNJ003', label: 'Indoor AC' },
    { number: '04', cardToken: 'SNJ004', label: 'Indoor AC' },
    { number: '05', cardToken: 'SNJ005', label: 'Outdoor Semi-Open' },
    { number: '06', cardToken: 'SNJ006', label: 'Outdoor Semi-Open' },
    { number: '07', cardToken: 'SNJ007', label: 'Outdoor Smoking' },
    { number: '08', cardToken: 'SNJ008', label: 'Outdoor Smoking' },
    { number: 'VIP 1', cardToken: 'SNJVIP1', label: 'Lantai 2' },
    { number: 'VIP 2', cardToken: 'SNJVIP2', label: 'Lantai 2' },
  ];

  const createdTables = [];
  for (const t of tableData) {
    const tbl = await prisma.table.create({
      data: {
        venueId: senja.id,
        number: t.number,
        cardToken: t.cardToken,
        label: t.label,
        status: t.number === '02' ? 'active' : 'empty',
      },
    });
    createdTables.push(tbl);
  }

  // 4. Create Categories
  const catCoffee = await prisma.category.create({
    data: { venueId: senja.id, name: 'Kopi Signature', sort: 1 },
  });
  const catNonCoffee = await prisma.category.create({
    data: { venueId: senja.id, name: 'Non-Kopi & Teh', sort: 2 },
  });
  const catFood = await prisma.category.create({
    data: { venueId: senja.id, name: 'Makanan Berat', sort: 3 },
  });
  const catSnacks = await prisma.category.create({
    data: { venueId: senja.id, name: 'Camilan / Bites', sort: 4 },
  });

  // 5. Create Menu Items with Modifiers
  // Item 1: Kopi Susu Gula Aren
  const kopiSusu = await prisma.menuItem.create({
    data: {
      venueId: senja.id,
      categoryId: catCoffee.id,
      name: 'Kopi Susu Gula Aren Senja',
      description: 'Espresso blend Arabika & Robusta dengan susu segar dan gula aren organik',
      price: 22000,
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
      isPopular: true,
      sort: 1,
    },
  });

  // Modifiers for Kopi Susu
  await prisma.optionGroup.create({
    data: {
      menuItemId: kopiSusu.id,
      name: 'Pilihan Suhu',
      type: 'single',
      required: true,
      sort: 1,
      choices: {
        create: [
          { name: 'Dingin / Iced', priceDelta: 0, sort: 1 },
          { name: 'Panas / Hot', priceDelta: 0, sort: 2 },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      menuItemId: kopiSusu.id,
      name: 'Level Gula',
      type: 'single',
      required: false,
      sort: 2,
      choices: {
        create: [
          { name: 'Normal Sweet (100%)', priceDelta: 0, sort: 1 },
          { name: 'Less Sweet (50%)', priceDelta: 0, sort: 2 },
          { name: 'No Sugar (0%)', priceDelta: 0, sort: 3 },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      menuItemId: kopiSusu.id,
      name: 'Tambahan Topping',
      type: 'multiple',
      required: false,
      sort: 3,
      choices: {
        create: [
          { name: 'Extra Espresso Shot', priceDelta: 4000, sort: 1 },
          { name: 'Cincau Manis', priceDelta: 3000, sort: 2 },
          { name: 'Oatmilk Swap', priceDelta: 6000, sort: 3 },
        ],
      },
    },
  });

  // Item 2: Caramel Macchiato
  await prisma.menuItem.create({
    data: {
      venueId: senja.id,
      categoryId: catCoffee.id,
      name: 'Caramel Macchiato',
      description: 'Vanilla syrup, steamed milk, espresso shot dengan drizzle karamel manis',
      price: 28000,
      imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80',
      isPopular: true,
      sort: 2,
    },
  });

  // Item 3: Matcha Latte
  await prisma.menuItem.create({
    data: {
      venueId: senja.id,
      categoryId: catNonCoffee.id,
      name: 'Uji Matcha Latte',
      description: 'Bubuk matcha murni asli Jepang dengan susu creamy',
      price: 26000,
      imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      sort: 1,
    },
  });

  // Item 4: Nasi Goreng Kampung
  const nasgor = await prisma.menuItem.create({
    data: {
      venueId: senja.id,
      categoryId: catFood.id,
      name: 'Nasi Goreng Kampung Senja',
      description: 'Nasi goreng racikan bumbu terasi tradisional, suwiran ayam, acar, dan kerupuk',
      price: 32000,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      isPopular: true,
      sort: 1,
    },
  });

  await prisma.optionGroup.create({
    data: {
      menuItemId: nasgor.id,
      name: 'Level Pedas',
      type: 'single',
      required: true,
      sort: 1,
      choices: {
        create: [
          { name: 'Tidak Pedas', priceDelta: 0, sort: 1 },
          { name: 'Sedang (Cabai 3)', priceDelta: 0, sort: 2 },
          { name: 'Pedas Gila (Cabai 10)', priceDelta: 2000, sort: 3 },
        ],
      },
    },
  });

  await prisma.optionGroup.create({
    data: {
      menuItemId: nasgor.id,
      name: 'Pilihan Telur',
      type: 'single',
      required: true,
      sort: 2,
      choices: {
        create: [
          { name: 'Telur Mata Sapi / Ceplok', priceDelta: 0, sort: 1 },
          { name: 'Telur Dadar Crispy', priceDelta: 0, sort: 2 },
        ],
      },
    },
  });

  // Item 5: Croffle & French Fries
  await prisma.menuItem.create({
    data: {
      venueId: senja.id,
      categoryId: catSnacks.id,
      name: 'Croffle Maple Glaze (2 Pcs)',
      description: 'Croissant waffle renyah dengan siraman sirup maple dan butter',
      price: 24000,
      imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
      isPopular: true,
      sort: 1,
    },
  });

  await prisma.menuItem.create({
    data: {
      venueId: senja.id,
      categoryId: catSnacks.id,
      name: 'Truffle French Fries',
      description: 'Kentang goreng renyah dengan aroma truffle oil dan taburan keju parmesan',
      price: 22000,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
      sort: 2,
    },
  });

  // 6. Sample Initial Active Order for Table 02
  const table2 = createdTables[1];
  const sampleOrder = await prisma.order.create({
    data: {
      venueId: senja.id,
      tableId: table2.id,
      orderNumber: '#101',
      customerName: 'Budi (Meja 02)',
      status: 'preparing',
      totalAmount: 54000,
      paymentMethod: 'cashier',
      isPaid: false,
      customerNote: 'Kopi tolong es-nya agak banyak ya',
      items: {
        create: [
          {
            menuItemId: kopiSusu.id,
            nameSnapshot: 'Kopi Susu Gula Aren Senja',
            priceSnapshot: 22000,
            quantity: 1,
            notes: 'Less sweet',
            selectedOptions: JSON.stringify([
              { group: 'Pilihan Suhu', choice: 'Dingin / Iced', priceDelta: 0 },
              { group: 'Level Gula', choice: 'Less Sweet (50%)', priceDelta: 0 },
            ]),
          },
          {
            menuItemId: nasgor.id,
            nameSnapshot: 'Nasi Goreng Kampung Senja',
            priceSnapshot: 32000,
            quantity: 1,
            notes: 'Pedas sedang',
            selectedOptions: JSON.stringify([
              { group: 'Level Pedas', choice: 'Sedang (Cabai 3)', priceDelta: 0 },
              { group: 'Pilihan Telur', choice: 'Telur Mata Sapi / Ceplok', priceDelta: 0 },
            ]),
          },
        ],
      },
    },
  });

  console.log('Database seeded successfully!');
  console.log('Venue:', senja.name, '(' + senja.slug + ')');
  console.log('Tables generated:', createdTables.length);
  console.log('Demo Table NFC cardToken:', createdTables[0].cardToken, '(Table 01)');
  console.log('Sample Order ID:', sampleOrder.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
