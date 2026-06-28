(function(){
  'use strict';

  const STORE_KEY = 'fixChillRepairManager.v1';
  const SESSION_KEY = 'fixChillAdminSession';
  const REMEMBER_KEY = 'fixChillAdminRememberUntil';
  const REMEMBER_EMAIL_KEY = 'fixChillAdminRememberEmail';
  const ADMIN_EMAIL = 'owner@fixandchill.local';
  const ADMIN_PASSWORD = 'FixChill2026!';

  const repairStatuses = [
    'Booked','Item Ordered','Item Received','Waiting for Part','Device Received','In Repair','Ready for Pickup',
    'Repair Completed','Delivered','Cancelled','Refunded'
  ];
  const orderStatuses = ['Not Ordered','Ordered','Shipped','Received','Cancelled'];
  const ticketPartStatuses = ['not_ordered','ordered','delivered','received_into_inventory','used_for_repair','cancelled'];
  const chatStatuses = ['AI Chatting','Needs Human Review','Technician Joined','Closed'];
  const ticketPartStatusLabels = {
    not_ordered:'Not Ordered',
    ordered:'Ordered',
    delivered:'Delivered',
    received_into_inventory:'Received Into Inventory',
    used_for_repair:'Used For Repair',
    cancelled:'Cancelled'
  };
  const defaultBrandNames = ['Apple','Samsung','Google','Motorola','OnePlus','iPad','Laptop'];
  const defaultPartCategoryNames = ['Screen','Battery','Charging Port','Back Glass','Front Camera','Rear Camera','Speaker','Earpiece Speaker','Microphone','Housing','Flex Cable','Face ID Parts','Buttons','SIM Tray','Adhesive','Other'];
  const deviceTypes = ['Phone','Tablet','Laptop','Game Console'];
  const qualityTypes = ['Aftermarket','Premium','Soft OLED','Soft OLED 1','Soft OLED Warranty Break','FOG','Hard OLED','Original Pull','Refurbished','OEM','Genuine'];
  const paymentMethods = ['','Cash','Credit/Debit Card','Venmo','Zelle','Other'];
  const campaignStatuses = ['Draft','Scheduled','Sent','Cancelled','Expired'];
  const discountTypes = ['Percentage','Fixed amount','Free diagnostic','Custom offer'];
  const targetTypes = [
    'All customers',
    'Customers with email only',
    'Customers with phone number only',
    'Customers repaired in last 30 days',
    'Customers repaired in last 6 months',
    'Customers repaired in last 1 year',
    'Customers by device type',
    'Manual selected customers'
  ];
  const defaultApplePhoneModels = [
    'iPhone 8','iPhone 8 Plus','iPhone X','iPhone XR','iPhone XS','iPhone XS Max',
    'iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max',
    'iPhone 12','iPhone 12 mini','iPhone 12 Pro','iPhone 12 Pro Max',
    'iPhone 13','iPhone 13 mini','iPhone 13 Pro','iPhone 13 Pro Max',
    'iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max',
    'iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max',
    'iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max',
    'iPhone 17','iPhone 17 Plus','iPhone 17 Pro','iPhone 17 Pro Max',
    'iPhone SE 2nd Gen','iPhone SE 3rd Gen'
  ];

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const money = value => value === '' || value == null ? '' : Number(value).toFixed(2);
  const toMoneyNumber = value => Math.max(0, Number(value || 0) || 0);
  const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || uid();
  const normalizePhone = value => String(value || '').replace(/\D/g, '');
  const normalizeEmail = value => String(value || '').trim().toLowerCase();

  function defaultBrands(){
    return defaultBrandNames.map(name => ({id:`brand-${slug(name)}`, brandName:name}));
  }

  function defaultPartCategories(){
    return defaultPartCategoryNames.map(name => ({id:`cat-${slug(name)}`, categoryName:name}));
  }

  function defaultData(){
    return {
      nextTicket:1001,
      brands:defaultBrands(),
      deviceModels:[],
      partCategories:defaultPartCategories(),
      customers:[],
      tickets:[],
      orders:[],
      inventory:[],
      usage:[],
      ticketParts:[],
      inventoryMovements:[],
      campaigns:[],
      emailLog:[],
      notificationQueue:[],
      chatConversations:[],
      chatLeads:[],
      chatNotifications:[],
      chatSettings:{
        ownerWhatsAppNumber:'13027273842',
        notificationEmail:'fixandchill1@gmail.com',
        whatsappEnabled:'yes',
        emailEnabled:'yes',
        workStart:'10:00',
        workEnd:'19:00'
      },
      emailSettings:{
        provider:'',
        fromName:'Fix & Chill Phone Repair',
        fromEmail:'fixandchill1@gmail.com',
        replyTo:'fixandchill1@gmail.com',
        enabled:false
      }
    };
  }

  function findByName(items, field, name){
    const normalized = String(name || '').trim().toLowerCase();
    return items.find(item => String(item[field] || '').trim().toLowerCase() === normalized);
  }

  function ensureBrand(data, name){
    const brandName = String(name || '').trim();
    if(!brandName) return '';
    let brand = findByName(data.brands, 'brandName', brandName);
    if(!brand){
      brand = {id:`brand-${slug(brandName)}`, brandName};
      if(data.brands.some(item => item.id === brand.id)) brand.id = uid();
      data.brands.push(brand);
    }
    return brand.id;
  }

  function ensureCategory(data, name){
    const categoryName = String(name || '').trim();
    if(!categoryName) return '';
    let category = findByName(data.partCategories, 'categoryName', categoryName);
    if(!category){
      category = {id:`cat-${slug(categoryName)}`, categoryName};
      if(data.partCategories.some(item => item.id === category.id)) category.id = uid();
      data.partCategories.push(category);
    }
    return category.id;
  }

  function ensureModel(data, brandId, modelName, deviceType){
    const name = String(modelName || '').trim();
    if(!brandId || !name) return '';
    let model = data.deviceModels.find(item => item.brandId === brandId && String(item.modelName || '').trim().toLowerCase() === name.toLowerCase());
    if(!model){
      model = {id:`model-${slug(`${brandId}-${name}`)}`, brandId, modelName:name, deviceType:deviceType || 'Phone'};
      if(data.deviceModels.some(item => item.id === model.id)) model.id = uid();
      data.deviceModels.push(model);
    }
    return model.id;
  }

  function seedDefaultDeviceModels(data){
    const appleId = ensureBrand(data, 'Apple');
    defaultApplePhoneModels.forEach(model => ensureModel(data, appleId, model, 'Phone'));
  }

  function brandById(data, id){
    return data.brands.find(brand => brand.id === id);
  }

  function modelById(data, id){
    return data.deviceModels.find(model => model.id === id);
  }

  function categoryById(data, id){
    return data.partCategories.find(category => category.id === id);
  }

  function brandName(data, id){
    return (brandById(data, id) || {}).brandName || '';
  }

  function modelName(data, id){
    return (modelById(data, id) || {}).modelName || '';
  }

  function calculateTicketPayments(ticket){
    const finalPrice = toMoneyNumber(ticket.finalPrice);
    const savedAmountPaid = toMoneyNumber(ticket.savedAmountPaid);
    let amountPaid = toMoneyNumber(ticket.amountPaid);
    const newPaymentAmount = toMoneyNumber(ticket.newPaymentAmount);
    if((ticket.paymentType || '') === 'Balance payment' && savedAmountPaid > 0 && !newPaymentAmount && amountPaid !== savedAmountPaid){
      amountPaid = savedAmountPaid + amountPaid;
    }else{
      amountPaid += newPaymentAmount;
    }
    const refundType = ticket.refundType || 'None';
    let refundAmount = toMoneyNumber(ticket.refundAmount);
    if(refundType === 'None') refundAmount = 0;
    if(refundType === 'Deposit refund' && !refundAmount) refundAmount = amountPaid;
    if(refundType === 'Full refund') refundAmount = amountPaid || finalPrice;
    refundAmount = Math.min(refundAmount, amountPaid || finalPrice);
    const adjustedTotal = ['Full refund','Deposit refund'].includes(refundType) ? 0 : Math.max(0, finalPrice - refundAmount);
    const netPaid = Math.max(0, amountPaid - refundAmount);
    const balanceDue = Math.max(0, adjustedTotal - netPaid);
    return {amountPaid, refundType, refundAmount, netPaid, balanceDue};
  }

  function prepareTicketPaymentSave(values, existingTicket){
    const savedAmountPaid = toMoneyNumber(values.savedAmountPaid || (existingTicket ? existingTicket.amountPaid : 0));
    let newPaymentAmount = toMoneyNumber(values.newPaymentAmount);
    if((values.paymentType || '') === 'Balance payment' && savedAmountPaid > 0 && !newPaymentAmount){
      const typedAmount = toMoneyNumber(values.amountPaid);
      if(typedAmount && typedAmount !== savedAmountPaid) newPaymentAmount = typedAmount;
    }
    const paymentMethod = values.paymentMethod || (existingTicket ? existingTicket.paymentMethod : '') || '';
    values.paymentHistory = existingTicket && Array.isArray(existingTicket.paymentHistory) ? existingTicket.paymentHistory.slice() : [];
    if(!existingTicket && toMoneyNumber(values.amountPaid) > 0 && !newPaymentAmount){
      values.paymentHistory.push({
        id:uid(),
        amount:toMoneyNumber(values.amountPaid).toFixed(2),
        method:paymentMethod || 'Not specified',
        type:values.paymentType || 'Payment',
        note:values.refundNotes || '',
        paidAt:new Date().toISOString()
      });
    }
    if(newPaymentAmount > 0){
      values.amountPaid = (savedAmountPaid ? savedAmountPaid + newPaymentAmount : toMoneyNumber(values.amountPaid) + newPaymentAmount).toFixed(2);
      values.paymentMethod = paymentMethod;
      values.paymentHistory.push({
        id:uid(),
        amount:newPaymentAmount.toFixed(2),
        method:paymentMethod || 'Not specified',
        type:values.paymentType || 'Balance payment',
        note:values.refundNotes || '',
        paidAt:new Date().toISOString()
      });
    }
    values.newPaymentAmount = '';
    values.savedAmountPaid = '';
    return values;
  }

  function applyTicketPayments(ticket){
    const calculated = calculateTicketPayments(ticket);
    ticket.refundType = calculated.refundType;
    ticket.amountPaid = calculated.amountPaid.toFixed(2);
    ticket.refundAmount = calculated.refundAmount.toFixed(2);
    ticket.netPaid = calculated.netPaid.toFixed(2);
    ticket.balanceDue = calculated.balanceDue.toFixed(2);
    return ticket;
  }

  function normalizeTicketStatus(status){
    const map = {
      'Part Ordered':'Item Ordered',
      'Part Received':'Item Received',
      'Completed':'Repair Completed'
    };
    return map[status] || status || 'Booked';
  }

  function partStatusLabel(status){
    return ticketPartStatusLabels[status] || status || '';
  }

  function partStatusPill(status){
    return statusPill(partStatusLabel(status));
  }

  function recordInventoryMovement(data, movement){
    data.inventoryMovements = data.inventoryMovements || [];
    data.inventoryMovements.push(Object.assign({
      id:uid(),
      createdAt:new Date().toISOString()
    }, movement));
  }

  function ticketPartTicket(data, part){
    return ticketById(data, part.ticketId);
  }

  function findMatchingInventoryForTicketPart(data, part){
    const ticket = ticketPartTicket(data, part);
    const brandId = ticket ? ticket.brandId : '';
    const deviceModelId = ticket ? ticket.deviceModelId : '';
    const category = String(part.repairType || '').trim().toLowerCase();
    const partName = String(part.partName || '').trim().toLowerCase();
    const supplier = String(part.supplierName || '').trim().toLowerCase();
    return data.inventory.find(entry => {
      const categoryMatch = categoryName(data, entry.partCategoryId).toLowerCase() === category;
      const partMatch = String(entry.partName || '').trim().toLowerCase() === partName;
      const supplierMatch = !supplier || String(entry.vendor || '').trim().toLowerCase() === supplier;
      return (!brandId || entry.brandId === brandId) &&
        (!deviceModelId || entry.deviceModelId === deviceModelId) &&
        categoryMatch && partMatch && supplierMatch;
    });
  }

  function findOrCreateInventoryForTicketPart(data, part){
    const ticket = ticketPartTicket(data, part);
    const brandId = ticket ? ticket.brandId : ensureBrand(data, 'Other');
    const deviceModelId = ticket ? ticket.deviceModelId : ensureModel(data, brandId, part.deviceModel || 'Other', 'Phone');
    const partCategoryId = ensureCategory(data, part.repairType || 'Other');
    let item = findMatchingInventoryForTicketPart(data, part);
    if(!item){
      item = {
        id:uid(),
        brandId,
        deviceModelId,
        partCategoryId,
        partName:part.partName,
        qualityType:'',
        sku:part.supplierSku || '',
        barcode:'',
        vendor:part.supplierName || '',
        costPrice:part.actualCost || part.estimatedCost || '',
        sellingPrice:'',
        quantityInStock:0,
        lowStockAlertQuantity:1,
        shelfLocation:'',
        notes:`Required for ticket ${ticket ? ticket.ticketNumber : ''}`.trim(),
        createdAt:today()
      };
      data.inventory.push(item);
    }
    return item;
  }

  function categoryName(data, id){
    return (categoryById(data, id) || {}).categoryName || '';
  }

  function deviceLabel(data, brandId, modelId){
    const brand = brandName(data, brandId);
    const model = modelName(data, modelId);
    if(brand && model.toLowerCase().startsWith(`${brand.toLowerCase()} `)) return model;
    return `${brand} ${model}`.trim();
  }

  function inferRepairCategory(issue){
    const text = String(issue || '').toLowerCase();
    if(/screen|glass|lcd|oled|display|crack/.test(text)) return 'Screen';
    if(/battery|dies fast|drain|charging slow/.test(text)) return 'Battery';
    if(/charging port|charge port|charger|not charging|usb/.test(text)) return 'Charging Port';
    if(/back glass|rear glass/.test(text)) return 'Back Glass';
    if(/camera/.test(text)) return text.includes('front') ? 'Front Camera' : 'Rear Camera';
    if(/speaker|earpiece/.test(text)) return text.includes('ear') ? 'Earpiece Speaker' : 'Speaker';
    if(/microphone|mic/.test(text)) return 'Microphone';
    return 'Other';
  }

  function inventoryCheckForRequest(data, deviceModel, issue){
    const modelText = String(deviceModel || '').trim().toLowerCase();
    const categoryText = inferRepairCategory(issue).toLowerCase();
    const matches = data.inventory.filter(item => {
      const model = modelName(data, item.deviceModelId).toLowerCase();
      const category = categoryName(data, item.partCategoryId).toLowerCase();
      const part = String(item.partName || '').toLowerCase();
      return modelText && model.includes(modelText.replace(/^samsung\s+|^apple\s+/i, '')) &&
        (category === categoryText || part.includes(categoryText) || categoryText === 'other');
    });
    const inStock = matches.find(item => Number(item.quantityInStock || 0) > 0);
    if(inStock){
      return {
        status:'in_stock',
        label:`In stock: ${inStock.quantityInStock}`,
        message:`${inStock.partName} appears available in inventory.`,
        partName:inStock.partName,
        quantity:Number(inStock.quantityInStock || 0),
        supplier:inStock.vendor || '',
        estimatedAvailability:'Available now'
      };
    }
    if(matches.length){
      const supplier = matches.find(item => item.vendor) || matches[0];
      return {
        status:'out_of_stock',
        label:'Out of stock',
        message:'Part is not currently in stock but can be ordered.',
        partName:matches[0].partName,
        quantity:0,
        supplier:supplier.vendor || '',
        estimatedAvailability:supplier.notes && /eta|arrival|shipping|day/i.test(supplier.notes) ? supplier.notes : 'Supplier availability needs confirmation'
      };
    }
    return {
      status:'not_found',
      label:'Part not found in inventory',
      message:'Requested part was not found in inventory. A technician should confirm availability.',
      partName:'',
      quantity:0,
      supplier:'',
      estimatedAvailability:'Unknown'
    };
  }

  function withinWorkingHours(settings){
    const now = new Date();
    const [startHour, startMinute] = String(settings.workStart || '10:00').split(':').map(Number);
    const [endHour, endMinute] = String(settings.workEnd || '19:00').split(':').map(Number);
    const start = new Date(now);
    start.setHours(startHour || 10, startMinute || 0, 0, 0);
    const end = new Date(now);
    end.setHours(endHour || 19, endMinute || 0, 0, 0);
    return now >= start && now <= end;
  }

  function chatTranscriptText(conversation){
    return (conversation.messages || []).map(message => `${message.sender}: ${message.text}`).join('\n');
  }

  function chatNeedsReview(data){
    return data.chatConversations.filter(chat => chat.status === 'Needs Human Review');
  }

  function whatsappLink(settings, text){
    const phone = String(settings.ownerWhatsAppNumber || '').replace(/\D/g, '');
    if(!phone) return '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  function normalizeData(data){
    const defaults = defaultData();
    data.brands = (data.brands && data.brands.length ? data.brands : defaults.brands).map(brand => ({
      id:brand.id || `brand-${slug(brand.brandName || brand.name)}`,
      brandName:brand.brandName || brand.name || ''
    }));
    defaultBrands().forEach(brand => {
      if(!findByName(data.brands, 'brandName', brand.brandName)) data.brands.push(brand);
    });
    data.deviceModels = data.deviceModels || [];
    seedDefaultDeviceModels(data);
    data.partCategories = (data.partCategories && data.partCategories.length ? data.partCategories : defaults.partCategories).map(category => ({
      id:category.id || `cat-${slug(category.categoryName || category.name)}`,
      categoryName:category.categoryName || category.name || ''
    }));
    defaultPartCategories().forEach(category => {
      if(!findByName(data.partCategories, 'categoryName', category.categoryName)) data.partCategories.push(category);
    });
    data.inventory = data.inventory || [];
    data.tickets = data.tickets || [];
    data.orders = data.orders || [];
    data.usage = data.usage || [];
    data.ticketParts = data.ticketParts || [];
    data.inventoryMovements = data.inventoryMovements || [];
    data.chatConversations = data.chatConversations || [];
    data.chatLeads = data.chatLeads || [];
    data.chatNotifications = data.chatNotifications || [];
    data.chatSettings = Object.assign(defaults.chatSettings, data.chatSettings || {});

    data.tickets.forEach(ticket => {
      if(!ticket.brandId && ticket.deviceBrand) ticket.brandId = ensureBrand(data, ticket.deviceBrand);
      if(!ticket.deviceModelId && ticket.deviceModel) ticket.deviceModelId = ensureModel(data, ticket.brandId || ensureBrand(data, ticket.deviceBrand || 'Other'), ticket.deviceModel, 'Phone');
      ticket.deviceBrand = ticket.deviceBrand || brandName(data, ticket.brandId);
      ticket.deviceModel = ticket.deviceModel || modelName(data, ticket.deviceModelId);
      const ticketCustomer = customerById(data, ticket.customerId);
      ticket.customerName = ticket.customerName || fullName(ticketCustomer);
      ticket.customerPhone = ticket.customerPhone || (ticketCustomer ? ticketCustomer.phone : '');
      ticket.status = normalizeTicketStatus(ticket.status);
      ticket.refundType = ticket.refundType || 'None';
      ticket.amountPaid = ticket.amountPaid || '';
      ticket.paymentMethod = ticket.paymentMethod || '';
      ticket.paymentHistory = Array.isArray(ticket.paymentHistory) ? ticket.paymentHistory : [];
      ticket.newPaymentAmount = '';
      ticket.refundAmount = ticket.refundAmount || '0.00';
      ticket.refundNotes = ticket.refundNotes || '';
      applyTicketPayments(ticket);
    });

    data.inventory.forEach(item => {
      if(!item.brandId) item.brandId = ensureBrand(data, item.brandName || '');
      if(!item.brandId && item.compatibleDeviceModel) item.brandId = ensureBrand(data, 'Other');
      if(!item.deviceModelId) item.deviceModelId = ensureModel(data, item.brandId, item.modelName || item.compatibleDeviceModel || '', 'Phone');
      if(!item.partCategoryId) item.partCategoryId = ensureCategory(data, item.categoryName || item.partCategory || 'Other');
      item.qualityType = item.qualityType || item.quality_type || '';
      if(item.qualityType === 'High Capacity') item.qualityType = 'Genuine';
      item.sku = item.sku || '';
      item.barcode = item.barcode || '';
      item.quantityInStock = Math.max(0, Number(item.quantityInStock ?? item.quantity ?? 0));
      item.lowStockAlertQuantity = Math.max(0, Number(item.lowStockAlertQuantity ?? item.lowStockAlert ?? 1));
      item.shelfLocation = item.shelfLocation || '';
    });

    data.orders.forEach(order => {
      const ticket = ticketById(data, order.ticketId);
      if(!order.brandId) order.brandId = ticket ? ticket.brandId : ensureBrand(data, order.brandName || '');
      if(!order.deviceModelId) order.deviceModelId = ticket ? ticket.deviceModelId : ensureModel(data, order.brandId, order.deviceModel || '', 'Phone');
      if(!order.partCategoryId) order.partCategoryId = ensureCategory(data, order.categoryName || order.partCategory || 'Other');
      order.deviceModel = order.deviceModel || modelName(data, order.deviceModelId);
      order.partCategory = order.partCategory || categoryName(data, order.partCategoryId);
      order.qualityType = order.qualityType || '';
      if(order.qualityType === 'High Capacity') order.qualityType = 'Genuine';
    });

    data.ticketParts.forEach(part => {
      const ticket = ticketPartTicket(data, part);
      part.ticketNumber = part.ticketNumber || (ticket ? ticket.ticketNumber : '');
      part.inventoryItemId = part.inventoryItemId || '';
      part.inventory_item_id = part.inventory_item_id || '';
      part.deviceModel = part.deviceModel || (ticket ? ticket.deviceModel : '');
      part.repairType = part.repairType || part.partCategory || '';
      part.quantityNeeded = Math.max(1, Number(part.quantityNeeded || part.quantity_needed || 1));
      part.quantityReceived = Math.max(0, Number(part.quantityReceived || part.quantity_received || 0));
      part.quantityUsed = Math.max(0, Number(part.quantityUsed || part.quantity_used || 0));
      part.supplierName = part.supplierName || part.supplier_name || '';
      part.supplierSku = part.supplierSku || part.supplier_sku || '';
      part.estimatedCost = part.estimatedCost || part.estimated_cost || '';
      part.actualCost = part.actualCost || part.actual_cost || '';
      part.orderNumber = part.orderNumber || part.order_number || '';
      part.trackingNumber = part.trackingNumber || part.tracking_number || '';
      part.partStatus = part.partStatus || part.part_status || 'not_ordered';
      part.notes = part.notes || '';
      part.createdAt = part.createdAt || part.created_at || today();
      part.updatedAt = part.updatedAt || part.updated_at || part.createdAt;
      part.orderedAt = part.orderedAt || part.ordered_at || '';
      part.deliveredAt = part.deliveredAt || part.delivered_at || '';
      part.receivedAt = part.receivedAt || part.received_at || '';
      part.usedAt = part.usedAt || part.used_at || '';
    });
    data.chatConversations.forEach(chat => {
      chat.messages = chat.messages || [];
      chat.status = chat.status || 'AI Chatting';
      if(!chatStatuses.includes(chat.status)) chat.status = 'AI Chatting';
      chat.customer = Object.assign({name:'', phone:'', deviceModel:'', issue:'', address:'', preferredTime:''}, chat.customer || {});
      chat.inventoryResult = Object.assign({status:'unknown', label:'Unknown', message:'Inventory has not been checked yet.'}, chat.inventoryResult || {});
      chat.summary = chat.summary || '';
      chat.createdAt = chat.createdAt || today();
      chat.updatedAt = chat.updatedAt || chat.createdAt;
      chat.handoffReason = chat.handoffReason || '';
      chat.aiEnabled = chat.aiEnabled !== false;
      chat.ownerUnread = Boolean(chat.ownerUnread);
      chat.customerUnread = Boolean(chat.customerUnread);
    });
    return data;
  }

  function loadData(){
    try{
      const data = Object.assign(defaultData(), JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
      normalizeData(data);
      data.customers.forEach(customer => {
        customer.emailConsent = customer.emailConsent || 'no';
        customer.smsConsent = customer.smsConsent || 'no';
        customer.unsubscribed = customer.unsubscribed || 'no';
      });
      data.campaigns.forEach(campaign => {
        campaign.manualCustomerIds = campaign.manualCustomerIds || [];
        campaign.createdAt = campaign.createdAt || today();
      });
      data.emailLog = data.emailLog || [];
      data.notificationQueue = data.notificationQueue || [];
      data.emailSettings = Object.assign(defaultData().emailSettings, data.emailSettings || {});
      data.chatSettings = Object.assign(defaultData().chatSettings, data.chatSettings || {});
      return data;
    }catch(e){
      return defaultData();
    }
  }

  function saveData(data){
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function fullName(customer){
    return customer ? customer.fullName : '';
  }

  function lastName(name){
    const parts = String(name || '').trim().split(/\s+/);
    return parts.length ? parts[parts.length - 1].toLowerCase() : '';
  }

  function ticketLabel(ticket){
    const customerText = ticket.customerName ? ` - ${ticket.customerName}${ticket.customerPhone ? ` (${ticket.customerPhone})` : ''}` : '';
    return `${ticket.ticketNumber}${customerText} - ${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}`.trim();
  }

  function customerLabel(customer){
    return `${customer.fullName} (${customer.phone || 'no phone'})`;
  }

  function ticketById(data, id){
    return data.tickets.find(ticket => ticket.id === id);
  }

  function customerById(data, id){
    return data.customers.find(customer => customer.id === id);
  }

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function formToObject(form){
    const formData = new FormData(form);
    const out = {};
    formData.forEach((value, key) => out[key] = String(value).trim());
    return out;
  }

  function fillForm(form, record){
    form.reset();
    Object.entries(record || {}).forEach(([key, value]) => {
      const field = form.elements[key];
      if(field) field.value = value == null ? '' : value;
    });
  }

  function populateSelect(select, items, getValue, getText, selected){
    if(!select) return;
    select.innerHTML = '<option value="">Select...</option>' + items.map(item => {
      const value = getValue(item);
      return `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(getText(item))}</option>`;
    }).join('');
  }

  function populatePlainSelect(select, values, selected){
    if(!select) return;
    select.innerHTML = values.map(value => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
  }

  function populateModelsForBrand(select, data, brandId, selected, searchTerm=''){
    const query = String(searchTerm || '').trim().toLowerCase();
    let models = data.deviceModels.filter(model =>
      (!brandId || model.brandId === brandId) &&
      (!query || [model.modelName, model.deviceType].join(' ').toLowerCase().includes(query))
    );
    if(selected && !models.some(model => model.id === selected)){
      const selectedModel = modelById(data, selected);
      if(selectedModel && (!brandId || selectedModel.brandId === brandId)) models = [selectedModel].concat(models);
    }
    populateSelect(select, models, model => model.id, model => `${model.modelName} (${model.deviceType})`, selected);
  }

  function inventoryPartLabel(data, item){
    const qty = Number(item.quantityInStock || 0);
    return `${item.partName} - ${item.qualityType || 'Standard'} - ${qty > 0 ? `${qty} in stock` : 'OUT OF STOCK'}`;
  }

  function compatibleInventoryParts(data, ticketOrModelId, categoryId, includeOutOfStock=false){
    const modelId = typeof ticketOrModelId === 'string' ? ticketOrModelId : ticketOrModelId && ticketOrModelId.deviceModelId;
    return data.inventory.filter(item =>
      item.deviceModelId === modelId &&
      (!categoryId || item.partCategoryId === categoryId) &&
      (includeOutOfStock || Number(item.quantityInStock || 0) > 0)
    ).sort((a, b) => {
      const stockSort = Number(b.quantityInStock || 0) - Number(a.quantityInStock || 0);
      return stockSort || [categoryName(data, a.partCategoryId), a.partName].join('|').localeCompare([categoryName(data, b.partCategoryId), b.partName].join('|'));
    });
  }

  function findInventoryForOrder(data, order){
    if(order.inventoryPartId){
      const byId = data.inventory.find(item => item.id === order.inventoryPartId);
      if(byId) return byId;
    }
    return data.inventory.find(item =>
      item.brandId === order.brandId &&
      item.deviceModelId === order.deviceModelId &&
      item.partCategoryId === order.partCategoryId &&
      item.partName.toLowerCase() === String(order.partName || '').toLowerCase() &&
      String(item.qualityType || '').toLowerCase() === String(order.qualityType || '').toLowerCase() &&
      String(item.vendor || '').toLowerCase() === String(order.vendor || '').toLowerCase()
    );
  }

  function receiveOrder(data, order){
    if(order.receivedApplied) return;
    const qty = Math.max(1, Number(order.quantity || 1));
    let item = findInventoryForOrder(data, order);
    if(!item){
      item = {
        id:uid(),
        brandId:order.brandId,
        deviceModelId:order.deviceModelId,
        partCategoryId:order.partCategoryId,
        partName:order.partName,
        qualityType:order.qualityType || '',
        sku:'',
        barcode:'',
        quantityInStock:0,
        costPrice:order.orderCost || '',
        sellingPrice:order.sellingPrice || '',
        vendor:order.vendor || '',
        lowStockAlertQuantity:1,
        shelfLocation:'',
        notes:`Received for ticket ${order.ticketNumber}`,
        createdAt:today()
      };
      data.inventory.push(item);
    }
    item.quantityInStock = Number(item.quantityInStock || 0) + qty;
    order.inventoryItemId = item.id;
    order.inventoryPartId = item.id;
    order.receivedApplied = true;
    order.receivedDate = order.receivedDate || today();
    const ticket = ticketById(data, order.ticketId);
    if(ticket) ticket.status = 'Item Received';
  }

  function installInventoryPart(data, item, ticket, qty, sourceOrder){
    const quantity = Math.max(1, Number(qty || 1));
    if(!item) return {ok:false, message:'Inventory item is missing.'};
    if(!ticket) return {ok:false, message:'Repair ticket is missing.'};
    if(item.deviceModelId !== ticket.deviceModelId) return {ok:false, message:'This part is not compatible with the selected repair ticket.'};
    if(Number(item.quantityInStock || 0) < quantity) return {ok:false, message:'Not enough stock. Inventory cannot go negative.'};
    item.quantityInStock = Number(item.quantityInStock || 0) - quantity;
    if(sourceOrder){
      sourceOrder.installedApplied = true;
      sourceOrder.installedDate = today();
    }
    data.usage.push({
      id:uid(),
      inventoryItemId:item.id,
      orderId:sourceOrder ? sourceOrder.id : '',
      ticketId:ticket.id,
      ticketNumber:ticket.ticketNumber,
      brandId:item.brandId,
      deviceModelId:item.deviceModelId,
      partCategoryId:item.partCategoryId,
      partName:item.partName,
      quantity,
      usedAt:today()
    });
    return {ok:true};
  }

  function installOrderPart(data, order){
    if(order.installedApplied) return {ok:true};
    const item = data.inventory.find(entry => entry.id === (order.inventoryPartId || order.inventoryItemId));
    const ticket = ticketById(data, order.ticketId);
    if(!item) return {ok:false, message:'Receive this part before installing it.'};
    return installInventoryPart(data, item, ticket, order.quantity, order);
  }

  function statusPill(status){
    const good = ['Received','Ready for Pickup','Repair Completed','Delivered','Item Received','Sent','AI Chatting'].includes(status) || String(status || '').startsWith('In Stock');
    const bad = ['Cancelled','Out of Stock','Closed'].includes(status);
    const warn = ['Booked','Item Ordered','Ordered','Shipped','Draft','Scheduled','Expired','Needs Human Review','Technician Joined','Refunded'].includes(status);
    return `<span class="fc-pill ${good ? 'good' : bad ? 'bad' : warn ? 'warn' : ''}">${escapeHtml(status || '')}</span>`;
  }

  function sendDateTime(campaign){
    if(!campaign.sendDate || !campaign.sendTime) return null;
    const date = new Date(`${campaign.sendDate}T${campaign.sendTime}`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function endOfCampaign(campaign){
    if(!campaign.endDate) return null;
    const date = new Date(`${campaign.endDate}T23:59:59`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function repairedCustomerIds(data, days){
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Set(data.tickets.filter(ticket => {
      const date = new Date(ticket.completedAt || ticket.createdAt || '');
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    }).map(ticket => ticket.customerId));
  }

  function campaignTargetCustomers(data, campaign){
    const type = campaign.targetType || 'All customers';
    if(type === 'All customers') return data.customers.slice();
    if(type === 'Customers with email only') return data.customers.filter(customer => customer.email);
    if(type === 'Customers with phone number only') return data.customers.filter(customer => customer.phone);
    if(type === 'Manual selected customers'){
      const ids = new Set(campaign.manualCustomerIds || []);
      return data.customers.filter(customer => ids.has(customer.id));
    }
    if(type === 'Customers by device type'){
      const query = String(campaign.targetDeviceType || '').trim().toLowerCase();
      if(!query) return [];
      const ids = new Set(data.tickets.filter(ticket =>
        [ticket.deviceBrand, ticket.deviceModel].join(' ').toLowerCase().includes(query)
      ).map(ticket => ticket.customerId));
      return data.customers.filter(customer => ids.has(customer.id));
    }
    const days = type.includes('30 days') ? 30 : type.includes('6 months') ? 183 : type.includes('1 year') ? 365 : 0;
    if(days){
      const ids = repairedCustomerIds(data, days);
      return data.customers.filter(customer => ids.has(customer.id));
    }
    return [];
  }

  function campaignRecipients(data, campaign){
    const usedEmails = new Set();
    return campaignTargetCustomers(data, campaign).filter(customer => {
      const email = String(customer.email || '').trim().toLowerCase();
      if(!email || !email.includes('@')) return false;
      if(customer.emailConsent !== 'yes') return false;
      if(customer.unsubscribed === 'yes') return false;
      if(usedEmails.has(email)) return false;
      usedEmails.add(email);
      return true;
    });
  }

  function campaignEmailBody(campaign, customer){
    const unsubscribeUrl = `${location.origin}/unsubscribe/?customer=${encodeURIComponent(customer.id)}&campaign=${encodeURIComponent(campaign.id)}`;
    const lines = [
      'Fix & Chill Phone Repair',
      '',
      campaign.subject,
      '',
      `Hi ${customer.fullName || 'there'},`,
      '',
      campaign.message,
      '',
      `Coupon code: ${campaign.couponCode || 'N/A'}`,
      `Discount: ${campaign.discountAmount || ''} ${campaign.discountType || ''}`.trim(),
      `Offer starts: ${campaign.startDate}`,
      `Offer ends: ${campaign.endDate}`,
      ''
    ];
    if(campaign.includeBrochure === 'yes'){
      lines.push('Campaign brochure:');
      lines.push(campaign.brochureHeadline || campaign.campaignName || campaign.subject || 'Special offer');
      if(campaign.brochureDetails) lines.push(campaign.brochureDetails);
      if(campaign.brochureImageUrl) lines.push(`Image: ${campaign.brochureImageUrl}`);
      lines.push('');
    }
    lines.push(
      'Contact Fix & Chill Phone Repair:',
      '(302) 727-3842',
      'fixandchill1@gmail.com',
      '',
      `Unsubscribe: ${unsubscribeUrl}`
    );
    return lines.join('\n');
  }

  function repairNotificationBody(ticket, customer){
    return [
      'Fix & Chill Phone Repair',
      '',
      `Repair ticket update: ${ticket.ticketNumber}`,
      '',
      `Hi ${customer.fullName || 'there'},`,
      '',
      `Your ${ticket.deviceBrand || ''} ${ticket.deviceModel || ''} repair status is: ${ticket.status}.`.trim(),
      ticket.estimatedCompletion ? `Estimated completion: ${ticket.estimatedCompletion}` : '',
      ticket.publicMessage ? `Message from shop: ${ticket.publicMessage}` : '',
      '',
      `Track your repair: ${location.origin}/track-repair/`,
      `For privacy, use ticket number ${ticket.ticketNumber} plus your phone number or last name. You can also use phone number + last name.`,
      '',
      'Contact Fix & Chill Phone Repair:',
      '(302) 727-3842',
      'fixandchill1@gmail.com'
    ].filter(Boolean).join('\n');
  }

  function queueRepairEmailNotification(data, ticket){
    const customer = customerById(data, ticket.customerId);
    if(!customer || !customer.email || customer.emailConsent !== 'yes' || customer.unsubscribed === 'yes') return;
    data.notificationQueue.push({
      id:uid(),
      type:'repair-ticket-email',
      status:'Pending provider setup',
      provider:data.emailSettings.provider || '',
      customerId:customer.id,
      customerName:customer.fullName,
      email:customer.email,
      ticketId:ticket.id,
      ticketNumber:ticket.ticketNumber,
      subject:`Fix & Chill repair update: ${ticket.ticketNumber}`,
      body:repairNotificationBody(ticket, customer),
      createdAt:new Date().toISOString(),
      note:'Email provider not connected yet. Ready for SendGrid/Mailgun/Resend/Laravel mail later.'
    });
  }

  function processDueCampaigns(data){
    const now = new Date();
    let sent = 0;
    let failed = 0;
    data.campaigns.forEach(campaign => {
      if(campaign.status !== 'Scheduled') return;
      const scheduledFor = sendDateTime(campaign);
      const expiresAt = endOfCampaign(campaign);
      if(!scheduledFor || now < scheduledFor) return;
      if(expiresAt && now > expiresAt){
        campaign.status = 'Expired';
        return;
      }
      campaignRecipients(data, campaign).forEach(customer => {
        const duplicate = data.emailLog.some(log =>
          log.campaignId === campaign.id &&
          log.customerId === customer.id &&
          log.status === 'Sent'
        );
        if(duplicate) return;
        const email = String(customer.email || '').trim();
        const ok = email.includes('@');
        data.emailLog.push({
          id:uid(),
          campaignId:campaign.id,
          customerId:customer.id,
          customerName:customer.fullName,
          email,
          status:ok ? 'Sent' : 'Failed',
          sentAt:ok ? new Date().toISOString() : '',
          failedAt:ok ? '' : new Date().toISOString(),
          error:ok ? '' : 'Missing or invalid email address',
          emailBody:ok ? campaignEmailBody(campaign, customer) : ''
        });
        if(ok) sent += 1; else failed += 1;
      });
      campaign.status = 'Sent';
    });
    return {sent, failed};
  }

  function initAdmin(){
    const app = $('#fc-admin-app');
    const login = $('#fc-login');
    let data = loadData();
    let current = 'dashboard';
    let editing = {customer:null,ticket:null,order:null,inventory:null,campaign:null,ticketPart:null};
    let selectedChatId = '';
    let lastHandoffCount = chatNeedsReview(data).length;
    let campaignTimer = null;

    function signedIn(){
      const rememberUntil = Number(localStorage.getItem(REMEMBER_KEY) || 0);
      if(rememberUntil && Date.now() < rememberUntil){
        sessionStorage.setItem(SESSION_KEY, 'yes');
        return true;
      }
      if(rememberUntil && Date.now() >= rememberUntil) localStorage.removeItem(REMEMBER_KEY);
      return sessionStorage.getItem(SESSION_KEY) === 'yes';
    }

    function showApp(){
      const isSignedIn = signedIn();
      login.style.display = isSignedIn ? 'none' : 'grid';
      app.style.display = isSignedIn ? 'grid' : 'none';
      if(!isSignedIn && $('#admin-email') && localStorage.getItem(REMEMBER_EMAIL_KEY)){
        $('#admin-email').value = localStorage.getItem(REMEMBER_EMAIL_KEY);
      }
      if(isSignedIn){
        render();
        if(!campaignTimer) campaignTimer = setInterval(render, 60000);
      }else if(campaignTimer){
        clearInterval(campaignTimer);
        campaignTimer = null;
      }
    }

    $('#login-form').addEventListener('submit', event => {
      event.preventDefault();
      const email = $('#admin-email').value.trim();
      const password = $('#admin-password').value;
      if(email === ADMIN_EMAIL && password === ADMIN_PASSWORD){
        sessionStorage.setItem(SESSION_KEY, 'yes');
        if($('#remember-admin-login') && $('#remember-admin-login').checked){
          localStorage.setItem(REMEMBER_KEY, String(Date.now() + 15 * 24 * 60 * 60 * 1000));
          localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        }else{
          localStorage.removeItem(REMEMBER_KEY);
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }
        $('#login-error').hidden = true;
        showApp();
      }else{
        $('#login-error').hidden = false;
      }
    });

    $('.fc-logout').addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      showApp();
    });

    $$('.fc-nav button').forEach(button => {
      button.addEventListener('click', () => {
        current = button.dataset.section;
        render();
        const section = $(`#section-${current}`);
        if(section) section.scrollIntoView({behavior:'smooth', block:'start'});
      });
    });

    function render(){
      data = loadData();
      processDueCampaigns(data);
      saveData(data);
      $$('.fc-nav button').forEach(button => button.classList.toggle('active', button.dataset.section === current));
      $$('.fc-section').forEach(section => section.classList.toggle('active', section.id === `section-${current}`));
      renderDashboard();
      renderCustomers();
      renderTickets();
      renderRequiredParts();
      renderPartsWaiting();
      renderOrders();
      renderInventory();
      renderChatInbox();
      renderCampaigns();
      renderSearch();
      renderPaymentHistory();
      populateAllSelects();
      updateTicketPaymentFields();
      updateTicketStockPreview();
    }

    function populateAllSelects(){
      const ticketCustomerQuery = $('#ticket-customer-search') ? $('#ticket-customer-search').value.toLowerCase() : '';
      const matchingTicketCustomers = data.customers.filter(customer => !ticketCustomerQuery || [customer.fullName, customer.phone, customer.email].join(' ').toLowerCase().includes(ticketCustomerQuery));
      let ticketCustomers = matchingTicketCustomers.slice(0, 5);
      const selectedTicketCustomer = $('#ticket-customer') ? $('#ticket-customer').value : '';
      if(selectedTicketCustomer && !ticketCustomers.some(customer => customer.id === selectedTicketCustomer)){
        const selectedCustomer = customerById(data, selectedTicketCustomer);
        if(selectedCustomer) ticketCustomers = [selectedCustomer].concat(ticketCustomers).slice(0, 5);
      }
      populateSelect($('#ticket-customer'), ticketCustomers, customer => customer.id, customerLabel, selectedTicketCustomer);
      if($('#ticket-customer-search-message')){
        $('#ticket-customer-search-message').textContent = matchingTicketCustomers.length > 5
          ? `Showing first 5 of ${matchingTicketCustomers.length} matches. Keep typing to narrow the list.`
          : matchingTicketCustomers.length
            ? `Showing ${matchingTicketCustomers.length} matching customer${matchingTicketCustomers.length === 1 ? '' : 's'}.`
            : 'No matching customer found. Add the customer first if this is a new customer.';
      }
      populateSelect($('#ticket-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#ticket-brand').value);
      populateModelsForBrand($('#ticket-model'), data, $('#ticket-brand').value, $('#ticket-model').value, $('#ticket-model-search') ? $('#ticket-model-search').value : '');
      populatePlainSelect($('#ticket-new-model-type'), deviceTypes, $('#ticket-new-model-type') ? $('#ticket-new-model-type').value || 'Phone' : 'Phone');
      populatePlainSelect($('#ticket-payment-method'), paymentMethods, $('#ticket-payment-method') ? $('#ticket-payment-method').value : '');
      populateSelect($('#ticket-repair-category'), data.partCategories, category => category.id, category => category.categoryName, $('#ticket-repair-category') ? $('#ticket-repair-category').value : '');
      populateSelect($('#ticket-inventory-part'), compatibleInventoryParts(data, $('#ticket-model') ? $('#ticket-model').value : '', $('#ticket-repair-category') ? $('#ticket-repair-category').value : '', true), item => item.id, item => inventoryPartLabel(data, item), $('#ticket-inventory-part') ? $('#ticket-inventory-part').value : '');
      populateSelect($('#order-ticket'), data.tickets, ticket => ticket.id, ticketLabel, $('#order-ticket').value);
      populateSelect($('#order-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#order-brand').value);
      populateModelsForBrand($('#order-device-model'), data, $('#order-brand').value, $('#order-device-model').value);
      populateSelect($('#order-category'), data.partCategories, category => category.id, category => category.categoryName, $('#order-category').value);
      const orderCompatible = data.inventory.filter(item =>
        item.deviceModelId === $('#order-device-model').value &&
        (!$('#order-category').value || item.partCategoryId === $('#order-category').value)
      );
      populateSelect($('#order-inventory-part'), orderCompatible, item => item.id, item => inventoryPartLabel(data, item), $('#order-inventory-part').value);
      populateSelect($('#install-order'), data.orders.filter(order => order.status === 'Received' && !order.installedApplied), order => order.id, order => `${order.ticketNumber} - ${order.partName}`, $('#install-order').value);
      populateSelect($('#ticket-part-ticket'), data.tickets, ticket => ticket.id, ticketLabel, $('#ticket-part-ticket').value);
      populateSelect($('#required-part-ticket'), data.tickets, ticket => ticket.id, ticketLabel, $('#required-part-ticket') ? $('#required-part-ticket').value : '');
      populatePlainSelect($('#required-part-status'), ticketPartStatuses, $('#required-part-status') ? $('#required-part-status').value || 'not_ordered' : 'not_ordered');
      populateSelect($('#ticket-part-category'), data.partCategories, category => category.id, category => category.categoryName, $('#ticket-part-category').value);
      const selectedTicket = ticketById(data, $('#ticket-part-ticket') ? $('#ticket-part-ticket').value : '');
      populateSelect($('#ticket-part-inventory'), compatibleInventoryParts(data, selectedTicket, $('#ticket-part-category') ? $('#ticket-part-category').value : ''), item => item.id, item => inventoryPartLabel(data, item), $('#ticket-part-inventory') ? $('#ticket-part-inventory').value : '');
      populateSelect($('#catalog-model-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#catalog-model-brand').value);
      populatePlainSelect($('#catalog-device-type'), deviceTypes, $('#catalog-device-type').value || 'Phone');
      populateSelect($('#inventory-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#inventory-brand').value);
      populateModelsForBrand($('#inventory-model'), data, $('#inventory-brand').value, $('#inventory-model').value, $('#inventory-model-search') ? $('#inventory-model-search').value : '');
      populatePlainSelect($('#inventory-new-model-type'), deviceTypes, $('#inventory-new-model-type') ? $('#inventory-new-model-type').value || 'Phone' : 'Phone');
      populateSelect($('#inventory-category'), data.partCategories, category => category.id, category => category.categoryName, $('#inventory-category').value);
      populateSelect($('#inventory-filter-brand'), [{id:'', brandName:'All brands'}].concat(data.brands), brand => brand.id, brand => brand.brandName, $('#inventory-filter-brand') ? $('#inventory-filter-brand').value : '');
      populateSelect($('#inventory-filter-model'), [{id:'', modelName:'All models', deviceType:''}].concat(data.deviceModels.filter(model => !$('#inventory-filter-brand') || !$('#inventory-filter-brand').value || model.brandId === $('#inventory-filter-brand').value)), model => model.id, model => model.deviceType ? `${model.modelName} (${model.deviceType})` : model.modelName, $('#inventory-filter-model') ? $('#inventory-filter-model').value : '');
      populateSelect($('#inventory-filter-category'), [{id:'', categoryName:'All categories'}].concat(data.partCategories), category => category.id, category => category.categoryName, $('#inventory-filter-category') ? $('#inventory-filter-category').value : '');
      $$('.status-select').forEach(select => {
        const source = select.dataset.kind === 'order' ? orderStatuses : repairStatuses;
        select.innerHTML = source.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
      });
      $$('.quality-select').forEach(select => populatePlainSelect(select, [''].concat(qualityTypes), select.value));
      const selectedDiscount = $('#discount-type') ? $('#discount-type').value : '';
      if($('#discount-type')) $('#discount-type').innerHTML = discountTypes.map(value => `<option value="${escapeHtml(value)}"${value === selectedDiscount ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
      const selectedCampaignStatus = $('#campaign-status') ? $('#campaign-status').value : '';
      if($('#campaign-status')) $('#campaign-status').innerHTML = campaignStatuses.map(value => `<option value="${escapeHtml(value)}"${value === selectedCampaignStatus ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
      const selectedTarget = $('#campaign-target') ? $('#campaign-target').value : '';
      if($('#campaign-target')) $('#campaign-target').innerHTML = targetTypes.map(value => `<option value="${escapeHtml(value)}"${value === selectedTarget ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');
      renderManualCustomerPicker();
    }

    function renderDashboard(){
      const activeRepairs = data.tickets.filter(ticket => !['Repair Completed','Delivered','Cancelled','Refunded'].includes(ticket.status)).length;
      const waiting = data.tickets.filter(ticket => ['Item Ordered'].includes(ticket.status)).length;
      const received = data.orders.filter(order => order.status === 'Received' && !order.installedApplied).length;
      const ready = data.tickets.filter(ticket => ticket.status === 'Ready for Pickup').length;
      const low = data.inventory.filter(item => Number(item.quantityInStock || 0) <= Number(item.lowStockAlertQuantity || 0));
      const handoffs = chatNeedsReview(data).length;
      $('#dashboard-stats').innerHTML = [
        ['Total active repairs', activeRepairs],
        ['Repairs waiting for parts', waiting],
        ['Parts received', received],
        ['Ready for pickup', ready],
        ['Low stock items', low.length],
        ['Chat handoffs waiting', handoffs]
      ].map(([label, value]) => `<div class="fc-card fc-stat${label.includes('Chat') && value ? ' fc-notification-card' : ''}"><strong>${value}</strong><span>${label}</span></div>`).join('');
      const badge = $('#chat-nav-badge');
      if(badge){
        badge.textContent = handoffs;
        badge.hidden = !handoffs;
      }
      $('#recent-tickets').innerHTML = ticketRows(data.tickets.slice().reverse().slice(0, 8));
      $('#low-stock-list').innerHTML = low.length ? low.map(item => `<tr><td>${escapeHtml(item.partName)}</td><td>${escapeHtml(brandName(data, item.brandId))}</td><td>${escapeHtml(modelName(data, item.deviceModelId))}</td><td>${item.quantityInStock}</td><td>${item.lowStockAlertQuantity}</td></tr>`).join('') : '<tr><td colspan="5">No low stock warnings.</td></tr>';
    }

    function customerRows(customers){
      if(!customers.length) return '<tr><td colspan="8">No customers yet.</td></tr>';
      return customers.map(customer => `
        <tr>
          <td><strong>${escapeHtml(customer.fullName)}</strong></td>
          <td>${customer.phone ? `<button class="fc-link-btn" type="button" data-use-customer="${customer.id}">${escapeHtml(customer.phone)}</button>` : '<span class="fc-muted">No phone</span>'}</td>
          <td>${customer.email ? `<button class="fc-link-btn" type="button" data-use-customer="${customer.id}">${escapeHtml(customer.email)}</button>` : '<span class="fc-muted">No email</span>'}</td>
          <td>
            ${customer.emailConsent === 'yes' ? statusPill('Email yes') : statusPill('Email no')}
            ${customer.smsConsent === 'yes' ? statusPill('SMS yes') : ''}
            ${customer.unsubscribed === 'yes' ? statusPill('Unsubscribed') : ''}
          </td>
          <td>${escapeHtml(customer.address)}</td>
          <td>${escapeHtml(customer.notes)}</td>
          <td>${escapeHtml(customer.createdAt)}</td>
          <td class="fc-actions">
            <button class="fc-btn secondary" data-edit-customer="${customer.id}">Edit</button>
            <button class="fc-btn danger" data-delete-customer="${customer.id}">Delete</button>
          </td>
        </tr>`).join('');
    }

    function renderCustomers(){
      const query = $('#customer-search').value.toLowerCase();
      const customers = data.customers.filter(customer => [customer.fullName, customer.phone, customer.email].join(' ').toLowerCase().includes(query));
      $('#customers-table').innerHTML = customerRows(customers);
    }

    function customerDuplicateMatches(values){
      const phone = normalizePhone(values.phone);
      const email = normalizeEmail(values.email);
      if(!phone && !email) return [];
      return data.customers.filter(customer => {
        if(editing.customer && customer.id === editing.customer) return false;
        const samePhone = phone && normalizePhone(customer.phone) === phone;
        const sameEmail = email && normalizeEmail(customer.email) === email;
        return samePhone || sameEmail;
      });
    }

    function renderCustomerDuplicateWarning(){
      const warning = $('#customer-duplicate-warning');
      if(!warning) return;
      const values = formToObject($('#customer-form'));
      const matches = customerDuplicateMatches(values);
      if(!matches.length){
        warning.hidden = true;
        warning.innerHTML = '';
        return;
      }
      warning.className = 'wide fc-alert bad';
      warning.innerHTML = `
        <strong>Possible duplicate customer found.</strong>
        <p>This phone number or email already exists. Use the existing customer instead of creating a duplicate when possible.</p>
        <div class="fc-actions">
          ${matches.slice(0, 5).map(customer => `<button class="fc-btn secondary" type="button" data-use-customer="${customer.id}">${escapeHtml(customer.fullName)} ${customer.phone ? `- ${escapeHtml(customer.phone)}` : ''} ${customer.email ? `- ${escapeHtml(customer.email)}` : ''}</button>`).join('')}
        </div>`;
      warning.hidden = false;
    }

    function startEditCustomer(customerId){
      const customer = customerById(data, customerId);
      if(!customer) return;
      editing.customer = customerId;
      fillForm($('#customer-form'), customer);
      $('#customer-submit').textContent = 'Update Customer';
      renderCustomerDuplicateWarning();
      $('#customer-form').scrollIntoView({behavior:'smooth', block:'start'});
    }

    $('#customer-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      const duplicates = customerDuplicateMatches(values);
      if(duplicates.length && !confirm('This phone or email already exists for another customer. Save as a separate customer anyway?')){
        renderCustomerDuplicateWarning();
        return;
      }
      if(editing.customer){
        Object.assign(customerById(data, editing.customer), values);
      }else{
        data.customers.push(Object.assign({id:uid(), createdAt:today()}, values));
      }
      saveData(data);
      editing.customer = null;
      $('#customer-submit').textContent = 'Add Customer';
      event.currentTarget.reset();
      renderCustomerDuplicateWarning();
      render();
    });

    $('#customer-reset').addEventListener('click', () => {
      editing.customer = null;
      $('#customer-submit').textContent = 'Add Customer';
      $('#customer-form').reset();
      renderCustomerDuplicateWarning();
    });

    $('#customer-search').addEventListener('input', renderCustomers);
    ['phone','email'].forEach(name => {
      const field = $('#customer-form').elements[name];
      if(field) field.addEventListener('input', renderCustomerDuplicateWarning);
      if(field) field.addEventListener('change', renderCustomerDuplicateWarning);
    });
    if($('#ticket-customer-search')) $('#ticket-customer-search').addEventListener('input', () => {
      data = loadData();
      populateAllSelects();
    });

    function ticketRows(tickets){
      if(!tickets.length) return '<tr><td colspan="13">No repair tickets yet.</td></tr>';
      return tickets.map(ticket => {
        const customer = customerById(data, ticket.customerId);
        const payment = calculateTicketPayments(ticket);
        return `<tr>
          <td><strong>${escapeHtml(ticket.ticketNumber)}</strong></td>
          <td>${escapeHtml(fullName(customer))}<br><span class="fc-muted">${escapeHtml(customer ? customer.phone : '')}</span></td>
          <td>${escapeHtml(deviceLabel(data, ticket.brandId, ticket.deviceModelId) || `${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}`.trim())}<br><span class="fc-muted">${escapeHtml(ticket.serial)}</span></td>
          <td>${escapeHtml(ticket.problem)}</td>
          <td>${statusPill(ticket.status)}</td>
          <td>${escapeHtml(ticket.estimatedCompletion)}</td>
          <td>$${money(ticket.estimatedPrice)}</td>
          <td>$${money(ticket.finalPrice)}</td>
          <td>${escapeHtml(ticket.paymentType || 'No payment collected')}<br>$${money(payment.amountPaid)}${ticket.paymentMethod ? `<br><span class="fc-muted">${escapeHtml(ticket.paymentMethod)}</span>` : ''}<br><span class="${payment.balanceDue > 0 ? 'fc-balance-due' : 'fc-balance-paid'}">Balance: $${money(payment.balanceDue)}</span></td>
          <td>${escapeHtml(payment.refundType)}<br>$${money(payment.refundAmount)}</td>
          <td>$${money(payment.netPaid)}</td>
          <td>${escapeHtml(ticket.createdAt)}</td>
          <td class="fc-actions">
            <button class="fc-btn secondary" data-edit-ticket="${ticket.id}">Edit</button>
            <button class="fc-btn danger" data-delete-ticket="${ticket.id}">Delete</button>
          </td>
        </tr>`;
      }).join('');
    }

    function paymentHistoryEntries(){
      return data.tickets.flatMap(ticket => {
        const customer = customerById(data, ticket.customerId);
        const history = Array.isArray(ticket.paymentHistory) ? ticket.paymentHistory.slice() : [];
        const historyTotal = history.reduce((sum, payment) => sum + toMoneyNumber(payment.amount), 0);
        const payment = calculateTicketPayments(ticket);
        const entries = history.map(item => Object.assign({
          ticketNumber:ticket.ticketNumber,
          customerName:fullName(customer),
          fallbackMethod:ticket.paymentMethod || '',
          fallbackType:ticket.paymentType || 'Payment'
        }, item));
        const missingPaid = Math.max(0, payment.amountPaid - historyTotal);
        if(missingPaid > 0.005){
          entries.unshift({
            id:`existing-${ticket.id}`,
            ticketNumber:ticket.ticketNumber,
            customerName:fullName(customer),
            type:ticket.paymentType || 'Existing payment/deposit',
            amount:missingPaid.toFixed(2),
            method:ticket.paymentMethod || 'Not specified',
            note:ticket.refundNotes || '',
            paidAt:ticket.createdAt || '',
            fallbackMethod:ticket.paymentMethod || '',
            fallbackType:ticket.paymentType || 'Payment'
          });
        }
        return entries;
      }).sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
    }

    function renderPaymentHistory(){
      const table = $('#payment-history-table');
      if(!table) return;
      const entries = paymentHistoryEntries();
      table.innerHTML = entries.length ? entries.map(entry => `
        <tr>
          <td>${escapeHtml(String(entry.paidAt || '').slice(0, 19).replace('T', ' '))}</td>
          <td><strong>${escapeHtml(entry.ticketNumber)}</strong></td>
          <td>${escapeHtml(entry.customerName)}</td>
          <td>${escapeHtml(entry.type || entry.fallbackType || 'Payment')}</td>
          <td><strong>$${money(entry.amount)}</strong></td>
          <td>${escapeHtml(entry.method || entry.fallbackMethod || 'Not specified')}</td>
          <td>${escapeHtml(entry.note || '')}</td>
        </tr>`).join('') : '<tr><td colspan="7">No payments recorded yet.</td></tr>';
    }

    function renderTickets(){
      const query = $('#ticket-search').value.toLowerCase();
      const tickets = data.tickets.filter(ticket => {
        const customer = customerById(data, ticket.customerId);
        return [ticket.ticketNumber, modelName(data, ticket.deviceModelId), brandName(data, ticket.brandId), ticket.deviceModel, ticket.deviceBrand, customer && customer.fullName, customer && customer.phone].join(' ').toLowerCase().includes(query);
      });
      $('#tickets-table').innerHTML = ticketRows(tickets);
    }

    function requiredPartRows(parts, includeCustomer=false){
      if(!parts.length) return `<tr><td colspan="11">No required parts found.</td></tr>`;
      return parts.map(part => {
        const ticket = ticketPartTicket(data, part);
        const customer = ticket ? customerById(data, ticket.customerId) : null;
        const stockItem = part.inventoryItemId ? data.inventory.find(entry => entry.id === part.inventoryItemId) : findMatchingInventoryForTicketPart(data, part);
        const stockQty = stockItem ? Number(stockItem.quantityInStock || 0) : 0;
        const neededQty = Math.max(1, Number(part.quantityNeeded || 1));
        const hasStock = stockQty >= neededQty;
        const stockLabel = hasStock ? statusPill(`In Stock: ${stockQty}`) : statusPill('Out of Stock');
        const canOrder = part.partStatus === 'not_ordered';
        const canDeliver = part.partStatus === 'ordered';
        const canReceive = part.partStatus === 'delivered';
        const canUse = part.partStatus === 'received_into_inventory';
        const actions = `
          ${canOrder ? `<button class="fc-btn secondary" data-part-action="ordered" data-ticket-part="${part.id}">Order Part</button>` : ''}
          ${canDeliver ? `<button class="fc-btn secondary" data-part-action="delivered" data-ticket-part="${part.id}">Mark as Delivered</button>` : ''}
          ${canReceive ? `<button class="fc-btn accent" data-part-action="receive" data-ticket-part="${part.id}">Receive Into Inventory</button>` : ''}
          ${hasStock && part.partStatus !== 'used_for_repair' && part.partStatus !== 'cancelled' ? `<button class="fc-btn accent" data-part-action="${canUse ? 'use' : 'use-existing'}" data-ticket-part="${part.id}">${canUse ? 'Use Part for Repair' : 'Use Existing Stock'}</button>` : ''}
          ${part.partStatus !== 'used_for_repair' && part.partStatus !== 'cancelled' ? `<button class="fc-btn danger" data-part-action="cancelled" data-ticket-part="${part.id}">Cancel</button>` : ''}
          <button class="fc-btn secondary" data-edit-ticket-part="${part.id}">Edit</button>`;
        if(includeCustomer){
          return `<tr>
            <td>${escapeHtml(ticket ? ticket.ticketNumber : part.ticketNumber)}</td>
            <td>${escapeHtml(fullName(customer))}<br><span class="fc-muted">${escapeHtml(customer ? customer.phone : '')}</span></td>
            <td>${escapeHtml(ticket ? deviceLabel(data, ticket.brandId, ticket.deviceModelId) : part.deviceModel)}</td>
            <td>${escapeHtml(part.partName)}<br><span class="fc-muted">${escapeHtml(part.supplierSku)}</span></td>
            <td>${escapeHtml(part.repairType)}</td>
            <td>${escapeHtml(part.quantityNeeded)}</td>
            <td>${escapeHtml(part.supplierName)}</td>
            <td>${partStatusPill(part.partStatus)}</td>
            <td>${stockLabel}</td>
            <td>${escapeHtml(part.trackingNumber)}</td>
            <td class="fc-actions">${actions}</td>
          </tr>`;
        }
        return `<tr>
          <td>${escapeHtml(ticket ? ticketLabel(ticket) : part.ticketNumber)}</td>
          <td>${escapeHtml(part.partName)}<br><span class="fc-muted">${escapeHtml(part.deviceModel)}</span></td>
          <td>${escapeHtml(part.repairType)}</td>
          <td>${escapeHtml(part.quantityNeeded)}</td>
          <td>${escapeHtml(part.quantityReceived)}</td>
          <td>${escapeHtml(part.quantityUsed)}</td>
          <td>${escapeHtml(part.supplierName)}<br><span class="fc-muted">${escapeHtml(part.supplierSku)}</span></td>
          <td>${partStatusPill(part.partStatus)}</td>
          <td>${stockLabel}</td>
          <td>Ordered: ${escapeHtml(part.orderedAt || '-')}<br>Delivered: ${escapeHtml(part.deliveredAt || '-')}<br>Received: ${escapeHtml(part.receivedAt || '-')}<br>Used: ${escapeHtml(part.usedAt || '-')}</td>
          <td class="fc-actions">${actions}</td>
        </tr>`;
      }).join('');
    }

    function renderRequiredParts(){
      const table = $('#ticket-required-parts-table');
      if(table) table.innerHTML = requiredPartRows(data.ticketParts.slice().reverse());
    }

    function renderPartsWaiting(){
      const table = $('#parts-waiting-table');
      if(!table) return;
      const waiting = data.ticketParts.filter(part => ['not_ordered','ordered','delivered'].includes(part.partStatus));
      table.innerHTML = requiredPartRows(waiting, true);
    }

    function updateTicketPaymentFields(){
      const form = $('#ticket-form');
      if(!form) return;
      const values = formToObject(form);
      const refundType = values.refundType || 'None';
      const refundInput = $('#ticket-refund-amount');
      const message = $('#ticket-payment-message');
      if(refundInput) refundInput.readOnly = !['Partial refund','Deposit refund'].includes(refundType);
      const calculated = calculateTicketPayments(values);
      if(refundInput) refundInput.value = calculated.refundAmount.toFixed(2);
      if($('#ticket-net-paid')) $('#ticket-net-paid').value = calculated.netPaid.toFixed(2);
      if($('#ticket-balance-due')) $('#ticket-balance-due').value = calculated.balanceDue.toFixed(2);
      if(message){
        const completedStatus = ['Repair Completed','Delivered','Refunded'].includes(normalizeTicketStatus(values.status));
        if(refundType === 'None'){
          message.className = 'wide fc-alert good';
          message.textContent = `No refund selected. Paid after refunds is the actual money kept so far: $${calculated.netPaid.toFixed(2)}.`;
        }else{
          message.className = 'wide fc-alert';
          message.textContent = `${refundType} selected. Paid after refunds is amount paid minus refund amount.`;
        }
        if(completedStatus && calculated.balanceDue > 0){
          message.className = 'wide fc-alert bad';
          message.textContent = `This ticket is completed but still has $${calculated.balanceDue.toFixed(2)} balance due. Choose payment method, enter that amount in Collect balance now, then update the ticket.`;
        }else if(completedStatus && calculated.balanceDue === 0){
          message.className = 'wide fc-alert good';
          message.textContent = 'This ticket is completed and the balance due is $0.00.';
        }
        message.hidden = false;
      }
    }

    function guidePaymentForCompletedTicket(){
      updateTicketPaymentFields();
      const form = $('#ticket-form');
      if(!form) return;
      const values = formToObject(form);
      const calculated = calculateTicketPayments(values);
      if(['Repair Completed','Delivered','Refunded'].includes(normalizeTicketStatus(values.status)) && calculated.balanceDue > 0){
        const paymentBox = $('#ticket-payment-box');
        if(paymentBox){
          paymentBox.classList.add('fc-attention');
          paymentBox.scrollIntoView({behavior:'smooth', block:'center'});
          setTimeout(() => paymentBox.classList.remove('fc-attention'), 1800);
        }
        const amountField = $('#ticket-new-payment-amount');
        if(amountField && !amountField.value) amountField.value = calculated.balanceDue.toFixed(2);
        const methodField = $('#ticket-payment-method');
        if(methodField && !methodField.value) methodField.focus();
        updateTicketPaymentFields();
      }
    }

    function guideBalancePaymentEntry(){
      const form = $('#ticket-form');
      if(!form) return;
      const values = formToObject(form);
      if(values.paymentType !== 'Balance payment') return;
      const amountField = form.elements.amountPaid;
      const newPaymentField = $('#ticket-new-payment-amount');
      const savedField = $('#ticket-saved-amount-paid');
      if(amountField && savedField && savedField.value) amountField.value = Number(savedField.value || 0).toFixed(2);
      const calculated = calculateTicketPayments(formToObject(form));
      if(newPaymentField && !newPaymentField.value) newPaymentField.value = calculated.balanceDue.toFixed(2);
      if(newPaymentField) newPaymentField.focus();
      updateTicketPaymentFields();
    }

    function updateTicketStockPreview(){
      const message = $('#ticket-stock-message');
      if(!message) return;
      const modelId = $('#ticket-model') ? $('#ticket-model').value : '';
      const categoryId = $('#ticket-repair-category') ? $('#ticket-repair-category').value : '';
      const partId = $('#ticket-inventory-part') ? $('#ticket-inventory-part').value : '';
      const qtyNeeded = Math.max(1, Number($('#ticket-repair-quantity') ? $('#ticket-repair-quantity').value || 1 : 1));
      const modelText = modelName(data, modelId);
      const categoryText = categoryName(data, categoryId);
      if(!modelId || !categoryId){
        message.hidden = true;
        return;
      }
      const matches = compatibleInventoryParts(data, modelId, categoryId, true);
      if(!matches.length){
        message.className = 'wide fc-alert bad';
        message.textContent = `${modelText} ${categoryText}: No matching inventory part found. You can still create this ticket and add/order the part later.`;
        message.hidden = false;
        return;
      }
      const item = data.inventory.find(entry => entry.id === partId) || matches[0];
      const qty = Number(item.quantityInStock || 0);
      const lowAlert = Number(item.lowStockAlertQuantity || 0);
      if($('#ticket-inventory-part') && !$('#ticket-inventory-part').value) $('#ticket-inventory-part').value = item.id;
      if(qty <= 0){
        message.className = 'wide fc-alert bad';
        message.textContent = `${item.partName} is OUT OF STOCK for ${modelText}. Ticket can still be created, but order/receive the part before using inventory.`;
      }else if(qty < qtyNeeded){
        message.className = 'wide fc-alert bad';
        message.textContent = `${item.partName} has only ${qty} in stock, but ${qtyNeeded} is needed. Inventory cannot go negative.`;
      }else if(qty <= lowAlert){
        message.className = 'wide fc-alert';
        message.textContent = `${item.partName} is available (${qty}), but this is at/below the low stock alert.`;
      }else{
        message.className = 'wide fc-alert good';
        message.textContent = `${item.partName} is available for ${modelText}. Current stock: ${qty}.`;
      }
      message.hidden = false;
    }

    function syncTicketSelectedPart(data, ticket, item, repairCategory, quantity, useNow){
      if(!ticket || (!item && !repairCategory)) return {ok:true};
      const qty = Math.max(1, Number(quantity || 1));
      let result = {ok:true};
      if(useNow === 'yes' && item){
        result = installInventoryPart(data, item, ticket, qty);
        if(!result.ok) return result;
        ticket.status = ticket.status === 'Booked' ? 'In Repair' : ticket.status;
      }
      const existing = item ? data.ticketParts.find(part => part.ticketId === ticket.id && part.inventoryItemId === item.id) : null;
      const stockQty = item ? Number(item.quantityInStock || 0) : 0;
      const partRecord = {
        ticketId:ticket.id,
        ticketNumber:ticket.ticketNumber,
        inventoryItemId:item ? item.id : '',
        partName:item ? item.partName : repairCategory,
        deviceModel:ticket.deviceModel || modelName(data, ticket.deviceModelId),
        repairType:repairCategory || (item ? categoryName(data, item.partCategoryId) : ''),
        quantityNeeded:qty,
        quantityReceived:item && stockQty > 0 ? qty : 0,
        quantityUsed:useNow === 'yes' ? qty : 0,
        supplierName:item ? item.vendor || '' : '',
        supplierSku:item ? item.sku || '' : '',
        estimatedCost:item ? item.costPrice || '' : '',
        actualCost:item ? item.costPrice || '' : '',
        orderNumber:'',
        trackingNumber:'',
        partStatus:useNow === 'yes' ? 'used_for_repair' : item && stockQty > 0 ? 'received_into_inventory' : 'not_ordered',
        notes:item && stockQty <= 0 ? 'Selected from inventory list, but stock is 0. Order/receive before repair.' : 'Added from repair ticket form.',
        updatedAt:new Date().toISOString(),
        usedAt:useNow === 'yes' ? today() : '',
        receivedAt:item && stockQty > 0 ? today() : ''
      };
      if(existing){
        Object.assign(existing, partRecord);
      }else{
        data.ticketParts.push(Object.assign({
          id:uid(),
          supplierId:'',
          createdAt:new Date().toISOString(),
          orderedAt:'',
          deliveredAt:''
        }, partRecord));
      }
      return result;
    }

    ['finalPrice','amountPaid','newPaymentAmount','refundAmount','refundType','paymentMethod','status'].forEach(name => {
      const field = $('#ticket-form').elements[name];
      if(field) field.addEventListener('input', updateTicketPaymentFields);
      if(field) field.addEventListener('change', updateTicketPaymentFields);
    });
    if($('#ticket-status')) $('#ticket-status').addEventListener('change', guidePaymentForCompletedTicket);
    if($('#ticket-payment-type')) $('#ticket-payment-type').addEventListener('change', guideBalancePaymentEntry);

    $('#ticket-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      const existingTicket = editing.ticket ? ticketById(data, editing.ticket) : null;
      const selectedInventoryItem = data.inventory.find(entry => entry.id === values.selectedInventoryPartId);
      const selectedRepairCategory = categoryName(data, values.repairCategoryId);
      const repairQuantity = Math.max(1, Number(values.repairQuantity || 1));
      if(values.useInventoryNow === 'yes' && (!selectedInventoryItem || Number(selectedInventoryItem.quantityInStock || 0) < repairQuantity)){
        const stockMessage = $('#ticket-stock-message');
        if(stockMessage){
          stockMessage.className = 'wide fc-alert bad';
          stockMessage.textContent = selectedInventoryItem ? `Cannot use ${selectedInventoryItem.partName}. Stock is ${selectedInventoryItem.quantityInStock || 0}, quantity needed is ${repairQuantity}.` : 'Choose an inventory part before using stock.';
          stockMessage.hidden = false;
        }
        return;
      }
      if(selectedRepairCategory && !String(values.problem || '').toLowerCase().includes(selectedRepairCategory.toLowerCase())){
        values.problem = `${selectedRepairCategory}${values.problem ? ` - ${values.problem}` : ''}`;
      }
      prepareTicketPaymentSave(values, existingTicket);
      applyTicketPayments(values);
      values.status = normalizeTicketStatus(values.status);
      const selectedCustomer = customerById(data, values.customerId);
      values.customerName = fullName(selectedCustomer);
      values.customerPhone = selectedCustomer ? selectedCustomer.phone : '';
      if(editing.ticket){
        const ticket = ticketById(data, editing.ticket);
        values.deviceBrand = brandName(data, values.brandId);
        values.deviceModel = modelName(data, values.deviceModelId);
        Object.assign(ticket, values);
        ticket.completedAt = ['Repair Completed','Delivered','Refunded'].includes(ticket.status) ? (ticket.completedAt || today()) : '';
        syncTicketSelectedPart(data, ticket, selectedInventoryItem, selectedRepairCategory, repairQuantity, values.useInventoryNow);
        queueRepairEmailNotification(data, ticket);
      }else{
        values.deviceBrand = brandName(data, values.brandId);
        values.deviceModel = modelName(data, values.deviceModelId);
        values.ticketNumber = `FC-${data.nextTicket++}`;
        values.createdAt = today();
        values.completedAt = ['Repair Completed','Delivered','Refunded'].includes(values.status) ? today() : '';
        const ticket = Object.assign({id:uid()}, values);
        data.tickets.push(ticket);
        syncTicketSelectedPart(data, ticket, selectedInventoryItem, selectedRepairCategory, repairQuantity, values.useInventoryNow);
        queueRepairEmailNotification(data, ticket);
      }
      saveData(data);
      editing.ticket = null;
      $('#ticket-submit').textContent = 'Create Ticket';
      event.currentTarget.reset();
      $('#ticket-status').value = 'Booked';
      if($('#ticket-new-payment-amount')) $('#ticket-new-payment-amount').value = '';
      if($('#ticket-saved-amount-paid')) $('#ticket-saved-amount-paid').value = '';
      updateTicketPaymentFields();
      render();
    });

    $('#ticket-reset').addEventListener('click', () => {
      editing.ticket = null;
      $('#ticket-submit').textContent = 'Create Ticket';
      $('#ticket-form').reset();
      $('#ticket-status').value = 'Booked';
      if($('#ticket-new-payment-amount')) $('#ticket-new-payment-amount').value = '';
      if($('#ticket-saved-amount-paid')) $('#ticket-saved-amount-paid').value = '';
      updateTicketPaymentFields();
    });

    $('#ticket-search').addEventListener('input', renderTickets);

    $('#ticket-required-part-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      const ticket = ticketById(data, values.ticketId);
      const message = $('#required-part-message');
      if(!ticket){
        message.className = 'wide fc-alert bad';
        message.textContent = 'Choose a repair ticket first.';
        message.hidden = false;
        return;
      }
      values.ticketNumber = ticket.ticketNumber;
      values.deviceModel = values.deviceModel || ticket.deviceModel || modelName(data, ticket.deviceModelId);
      values.quantityNeeded = Math.max(1, Number(values.quantityNeeded || 1));
      values.quantityReceived = Math.max(0, Number(values.quantityReceived || 0));
      values.quantityUsed = Math.max(0, Number(values.quantityUsed || 0));
      values.partStatus = values.partStatus || 'not_ordered';
      values.updatedAt = new Date().toISOString();
      if(editing.ticketPart){
        Object.assign(data.ticketParts.find(part => part.id === editing.ticketPart), values);
      }else{
        data.ticketParts.push(Object.assign({id:uid(), inventoryItemId:'', supplierId:'', createdAt:new Date().toISOString(), orderedAt:'', deliveredAt:'', receivedAt:'', usedAt:''}, values));
      }
      saveData(data);
      editing.ticketPart = null;
      $('#required-part-submit').textContent = 'Save Required Part';
      event.currentTarget.reset();
      $('#required-part-status').value = 'not_ordered';
      message.className = 'wide fc-alert good';
      message.textContent = 'Required part saved. Part is not in stock. You can still create this ticket.';
      message.hidden = false;
      render();
    });

    $('#required-part-reset').addEventListener('click', () => {
      editing.ticketPart = null;
      $('#required-part-submit').textContent = 'Save Required Part';
      $('#ticket-required-part-form').reset();
      $('#required-part-status').value = 'not_ordered';
    });

    function applyTicketPartAction(partId, action){
      const part = data.ticketParts.find(entry => entry.id === partId);
      if(!part) return {ok:false, message:'Required part not found.'};
      const now = new Date().toISOString();
      if(action === 'ordered'){
        part.partStatus = 'ordered';
        part.orderedAt = part.orderedAt || now;
        const ticket = ticketPartTicket(data, part);
        if(ticket) ticket.status = 'Waiting for Part';
      }else if(action === 'delivered'){
        part.partStatus = 'delivered';
        part.deliveredAt = part.deliveredAt || now;
        const ticket = ticketPartTicket(data, part);
        if(ticket) ticket.status = 'Item Received';
      }else if(action === 'receive'){
        const item = findOrCreateInventoryForTicketPart(data, part);
        const qty = Math.max(1, Number(part.quantityReceived || part.quantityNeeded || 1));
        item.quantityInStock = Number(item.quantityInStock || 0) + qty;
        part.inventoryItemId = item.id;
        part.quantityReceived = qty;
        part.partStatus = 'received_into_inventory';
        part.receivedAt = part.receivedAt || now;
        recordInventoryMovement(data, {type:'receive_ticket_part', inventoryItemId:item.id, ticketPartId:part.id, ticketId:part.ticketId, ticketNumber:part.ticketNumber, quantity:qty, partName:part.partName});
      }else if(action === 'use' || action === 'use-existing'){
        const item = part.inventoryItemId ? data.inventory.find(entry => entry.id === part.inventoryItemId) : findMatchingInventoryForTicketPart(data, part);
        const qty = Math.max(1, Number(part.quantityUsed || part.quantityNeeded || 1));
        if(!item || Number(item.quantityInStock || 0) < qty) return {ok:false, message:'Not enough stock. Inventory cannot go negative.'};
        item.quantityInStock = Number(item.quantityInStock || 0) - qty;
        part.inventoryItemId = item.id;
        part.quantityUsed = qty;
        part.partStatus = 'used_for_repair';
        part.usedAt = part.usedAt || now;
        const ticket = ticketPartTicket(data, part);
        if(ticket) ticket.status = 'Repair Completed';
        data.usage.push({
          id:uid(),
          inventoryItemId:item.id,
          orderId:'',
          ticketPartId:part.id,
          ticketId:part.ticketId,
          ticketNumber:part.ticketNumber,
          brandId:item.brandId,
          deviceModelId:item.deviceModelId,
          partCategoryId:item.partCategoryId,
          partName:item.partName,
          quantity:qty,
          usedAt:today()
        });
        recordInventoryMovement(data, {type:'use_ticket_part', inventoryItemId:item.id, ticketPartId:part.id, ticketId:part.ticketId, ticketNumber:part.ticketNumber, quantity:-qty, partName:part.partName});
      }else if(action === 'cancelled'){
        part.partStatus = 'cancelled';
      }
      part.updatedAt = now;
      return {ok:true, message:`Part status updated to ${partStatusLabel(part.partStatus)}.`};
    }

    function orderRows(orders){
      if(!orders.length) return '<tr><td colspan="11">No part orders yet.</td></tr>';
      return orders.map(order => {
        const ticket = ticketById(data, order.ticketId);
        const customer = ticket ? customerById(data, ticket.customerId) : null;
        return `<tr>
          <td><strong>${escapeHtml(order.ticketNumber)}</strong></td>
          <td>${escapeHtml(fullName(customer))}</td>
          <td>${escapeHtml(deviceLabel(data, order.brandId, order.deviceModelId) || order.deviceModel)}</td>
          <td>${escapeHtml(order.partName)}</td>
          <td>${escapeHtml(categoryName(data, order.partCategoryId) || order.partCategory)}</td>
          <td>${escapeHtml(order.vendor)}</td>
          <td>${statusPill(order.status)}</td>
          <td>${escapeHtml(order.trackingNumber)}</td>
          <td>${escapeHtml(order.estimatedArrival)}</td>
          <td>${order.installedApplied ? statusPill('Installed') : order.receivedApplied ? statusPill('In stock for ticket') : '<span class="fc-pill">Pending</span>'}</td>
          <td class="fc-actions">
            <button class="fc-btn secondary" data-edit-order="${order.id}">Edit</button>
            ${order.status === 'Received' && !order.installedApplied ? `<button class="fc-btn accent" data-install-order="${order.id}">Install</button>` : ''}
            <button class="fc-btn danger" data-delete-order="${order.id}">Delete</button>
          </td>
        </tr>`;
      }).join('');
    }

    function renderOrders(){
      $('#orders-table').innerHTML = orderRows(data.orders);
    }

    $('#order-ticket').addEventListener('change', event => {
      const ticket = ticketById(loadData(), event.target.value);
      if(!ticket) return;
      $('#order-brand').value = ticket.brandId || '';
      populateModelsForBrand($('#order-device-model'), loadData(), ticket.brandId, ticket.deviceModelId);
      $('#order-device-model').value = ticket.deviceModelId || '';
    });

    $('#order-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      const ticket = ticketById(data, values.ticketId);
      if(!ticket) return;
      values.ticketNumber = ticket.ticketNumber;
      values.brandId = values.brandId || ticket.brandId;
      values.deviceModelId = values.deviceModelId || ticket.deviceModelId;
      values.deviceModel = modelName(data, values.deviceModelId);
      values.partCategory = categoryName(data, values.partCategoryId);
      values.quantity = Math.max(1, Number(values.quantity || 1));
      if(values.status === 'Ordered' || values.status === 'Shipped') ticket.status = 'Item Ordered';
      if(values.status === 'Received') ticket.status = 'Item Received';
      if(editing.order){
        const order = data.orders.find(entry => entry.id === editing.order);
        const wasReceived = order.status === 'Received';
        Object.assign(order, values);
        if(order.status === 'Received' && !wasReceived) receiveOrder(data, order);
        if(order.status === 'Received' && !order.receivedApplied) receiveOrder(data, order);
      }else{
        const order = Object.assign({id:uid(), createdAt:today(), receivedApplied:false, installedApplied:false}, values);
        if(order.status === 'Received') receiveOrder(data, order);
        data.orders.push(order);
      }
      saveData(data);
      editing.order = null;
      $('#order-submit').textContent = 'Create Part Order';
      event.currentTarget.reset();
      $('#order-status').value = 'Not Ordered';
      render();
    });

    $('#order-reset').addEventListener('click', () => {
      editing.order = null;
      $('#order-submit').textContent = 'Create Part Order';
      $('#order-form').reset();
      $('#order-status').value = 'Not Ordered';
    });

    $('#install-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const order = data.orders.find(entry => entry.id === $('#install-order').value);
      const ticket = order && ticketById(data, order.ticketId);
      const message = $('#install-message');
      if(!order || !ticket) return;
      const result = installOrderPart(data, order);
      if(!result.ok){
        message.className = 'fc-alert bad';
        message.textContent = result.message;
        message.hidden = false;
        return;
      }
      const shouldComplete = $('#install-complete').value === 'yes';
      ticket.status = shouldComplete ? 'Repair Completed' : 'In Repair';
      ticket.completedAt = shouldComplete ? today() : ticket.completedAt;
      saveData(data);
      message.className = 'fc-alert good';
      message.textContent = 'Part assigned to this ticket. Inventory was decreased and usage history was recorded.';
      message.hidden = false;
      event.currentTarget.reset();
      render();
    });

    function inventoryRows(items){
      if(!items.length) return '<tr><td colspan="10">No inventory items yet.</td></tr>';
      return items.map(item => {
        const low = Number(item.quantityInStock || 0) <= Number(item.lowStockAlertQuantity || 0);
        return `<tr>
          <td><strong>${escapeHtml(brandName(data, item.brandId))}</strong><br>${escapeHtml(modelName(data, item.deviceModelId))}<br><span class="fc-muted">${escapeHtml(categoryName(data, item.partCategoryId))}</span></td>
          <td><strong>${escapeHtml(item.partName)}</strong><br><span class="fc-muted">${escapeHtml(item.notes)}</span></td>
          <td>${escapeHtml(item.qualityType || 'Standard')}</td>
          <td>${escapeHtml(item.sku)}<br><span class="fc-muted">${escapeHtml(item.barcode)}</span></td>
          <td>${low ? statusPill('Low stock') : statusPill('In stock')} ${item.quantityInStock}</td>
          <td>$${money(item.costPrice)}</td>
          <td>$${money(item.sellingPrice)}</td>
          <td>${escapeHtml(item.vendor)}</td>
          <td>${escapeHtml(item.shelfLocation)}</td>
          <td class="fc-actions">
            <button class="fc-btn secondary" data-edit-inventory="${item.id}">Edit</button>
            <button class="fc-btn danger" data-delete-inventory="${item.id}">Delete</button>
          </td>
        </tr>`;
      }).join('');
    }

    function renderModelStockCheck(){
      const table = $('#model-stock-table');
      const summary = $('#model-stock-summary');
      const input = $('#model-stock-search');
      if(!table || !summary || !input) return;
      const query = input.value.toLowerCase().trim();
      if(!query){
        summary.className = 'fc-alert';
        summary.textContent = 'Type a model name to see all saved inventory parts for that device.';
        table.innerHTML = '<tr><td colspan="8">No model searched yet.</td></tr>';
        return;
      }
      const normalizedQuery = query.replace(/^apple\s+|^samsung\s+|^google\s+|^motorola\s+|^oneplus\s+/i, '').trim();
      const items = data.inventory.filter(item => {
        const model = modelName(data, item.deviceModelId).toLowerCase();
        const brand = brandName(data, item.brandId).toLowerCase();
        const haystack = [brand, model, `${brand} ${model}`, item.partName, categoryName(data, item.partCategoryId), item.qualityType, item.sku, item.vendor].join(' ').toLowerCase();
        return haystack.includes(query) || (normalizedQuery && model.includes(normalizedQuery));
      }).sort((a, b) => [modelName(data, a.deviceModelId), categoryName(data, a.partCategoryId), a.partName].join('|').localeCompare([modelName(data, b.deviceModelId), categoryName(data, b.partCategoryId), b.partName].join('|')));
      const inStockCount = items.filter(item => Number(item.quantityInStock || 0) > 0).length;
      summary.className = `fc-alert ${items.length ? 'good' : 'bad'}`;
      summary.textContent = items.length
        ? `${items.length} part item(s) found for this model. ${inStockCount} item(s) currently in stock.`
        : 'No inventory parts found for that model name.';
      table.innerHTML = items.length ? items.map(item => {
        const qty = Number(item.quantityInStock || 0);
        return `<tr>
          <td>${escapeHtml(brandName(data, item.brandId))}<br><strong>${escapeHtml(modelName(data, item.deviceModelId))}</strong></td>
          <td>${escapeHtml(categoryName(data, item.partCategoryId))}</td>
          <td><strong>${escapeHtml(item.partName)}</strong><br><span class="fc-muted">${escapeHtml(item.sku)}</span></td>
          <td>${escapeHtml(item.qualityType || 'Standard')}</td>
          <td>${qty > 0 ? statusPill(`In Stock: ${qty}`) : statusPill('Out of Stock')}</td>
          <td>$${money(item.sellingPrice)}</td>
          <td>${escapeHtml(item.vendor)}</td>
          <td>${escapeHtml(item.shelfLocation)}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="8">No inventory parts found for that model.</td></tr>';
    }

    function renderInventory(){
      const query = ($('#inventory-search') ? $('#inventory-search').value : '').toLowerCase();
      const brandFilter = $('#inventory-filter-brand') ? $('#inventory-filter-brand').value : '';
      const modelFilter = $('#inventory-filter-model') ? $('#inventory-filter-model').value : '';
      const categoryFilter = $('#inventory-filter-category') ? $('#inventory-filter-category').value : '';
      const lowOnly = $('#inventory-filter-low') ? $('#inventory-filter-low').checked : false;
      const items = data.inventory.filter(item => {
        const haystack = [brandName(data, item.brandId), modelName(data, item.deviceModelId), categoryName(data, item.partCategoryId), item.partName, item.qualityType, item.sku, item.barcode, item.vendor, item.shelfLocation, item.notes].join(' ').toLowerCase();
        const low = Number(item.quantityInStock || 0) <= Number(item.lowStockAlertQuantity || 0);
        return (!query || haystack.includes(query)) &&
          (!brandFilter || item.brandId === brandFilter) &&
          (!modelFilter || item.deviceModelId === modelFilter) &&
          (!categoryFilter || item.partCategoryId === categoryFilter) &&
          (!lowOnly || low);
      });
      items.sort((a, b) => [brandName(data, a.brandId), modelName(data, a.deviceModelId), categoryName(data, a.partCategoryId), a.partName].join('|').localeCompare([brandName(data, b.brandId), modelName(data, b.deviceModelId), categoryName(data, b.partCategoryId), b.partName].join('|')));
      $('#inventory-table').innerHTML = inventoryRows(items);
      renderModelStockCheck();
      $('#usage-table').innerHTML = data.usage.length ? data.usage.slice().reverse().map(use => `<tr><td>${escapeHtml(use.usedAt)}</td><td>${escapeHtml(use.ticketNumber)}</td><td>${escapeHtml(brandName(data, use.brandId))}</td><td>${escapeHtml(modelName(data, use.deviceModelId))}</td><td>${escapeHtml(categoryName(data, use.partCategoryId))}</td><td>${escapeHtml(use.partName)}</td><td>${escapeHtml(use.quantity)}</td></tr>`).join('') : '<tr><td colspan="7">No parts installed yet.</td></tr>';
    }

    $('#catalog-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      const added = [];
      if(values.brandName){
        ensureBrand(data, values.brandName);
        added.push(`brand ${values.brandName}`);
      }
      if(values.modelBrandId && values.modelName){
        ensureModel(data, values.modelBrandId, values.modelName, values.deviceType || 'Phone');
        added.push(`model ${values.modelName}`);
      }
      if(values.categoryName){
        ensureCategory(data, values.categoryName);
        added.push(`category ${values.categoryName}`);
      }
      saveData(data);
      const message = $('#catalog-message');
      message.className = added.length ? 'wide fc-alert good' : 'wide fc-alert bad';
      message.textContent = added.length ? `Added ${added.join(', ')}.` : 'Enter at least one catalog item to add.';
      message.hidden = false;
      event.currentTarget.reset();
      render();
    });

    $('#inventory-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      values.quantityInStock = Math.max(0, Number(values.quantityInStock || 0));
      values.lowStockAlertQuantity = Math.max(0, Number(values.lowStockAlertQuantity || 0));
      if(editing.inventory){
        Object.assign(data.inventory.find(item => item.id === editing.inventory), values);
      }else{
        data.inventory.push(Object.assign({id:uid(), createdAt:today()}, values));
      }
      saveData(data);
      editing.inventory = null;
      $('#inventory-submit').textContent = 'Save Inventory Item';
      event.currentTarget.reset();
      render();
    });

    $('#inventory-reset').addEventListener('click', () => {
      editing.inventory = null;
      $('#inventory-submit').textContent = 'Save Inventory Item';
      $('#inventory-form').reset();
      populateAllSelects();
    });

    $('#ticket-part-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const ticket = ticketById(data, $('#ticket-part-ticket').value);
      const item = data.inventory.find(entry => entry.id === $('#ticket-part-inventory').value);
      const message = $('#ticket-part-message');
      const result = installInventoryPart(data, item, ticket, $('#ticket-part-quantity').value);
      if(!result.ok){
        message.className = 'wide fc-alert bad';
        message.textContent = result.message;
        message.hidden = false;
        return;
      }
      if($('#ticket-part-complete').value === 'yes'){
        ticket.status = 'Repair Completed';
        ticket.completedAt = today();
      }else{
        ticket.status = 'In Repair';
      }
      saveData(data);
      message.className = 'wide fc-alert good';
      message.textContent = 'Part assigned to this ticket. Inventory was decreased and usage history was recorded.';
      message.hidden = false;
      event.currentTarget.reset();
      render();
    });

    ['ticket-brand','ticket-model','ticket-repair-category','ticket-inventory-part','ticket-use-inventory-now','order-brand','order-device-model','order-category','order-inventory-part','ticket-part-ticket','ticket-part-category','inventory-brand','inventory-filter-brand','inventory-filter-model','inventory-filter-category'].forEach(id => {
      const element = $(`#${id}`);
      if(element) element.addEventListener('change', () => {
        if(id === 'ticket-brand'){
          $('#ticket-model').value = '';
          if($('#ticket-model-search')) $('#ticket-model-search').value = '';
        }
        if(id === 'ticket-model' || id === 'ticket-repair-category') $('#ticket-inventory-part').value = '';
        if(id === 'order-brand') $('#order-device-model').value = '';
        if(id === 'inventory-brand'){
          $('#inventory-model').value = '';
          if($('#inventory-model-search')) $('#inventory-model-search').value = '';
        }
        if(id === 'inventory-filter-brand') $('#inventory-filter-model').value = '';
        data = loadData();
        populateAllSelects();
        updateTicketStockPreview();
        renderInventory();
      });
    });

    if($('#ticket-repair-quantity')) $('#ticket-repair-quantity').addEventListener('input', updateTicketStockPreview);

    if($('#ticket-model-search')) $('#ticket-model-search').addEventListener('input', () => {
      data = loadData();
      populateAllSelects();
      updateTicketStockPreview();
    });

    if($('#inventory-model-search')) $('#inventory-model-search').addEventListener('input', () => {
      data = loadData();
      populateAllSelects();
    });

    if($('#ticket-add-model')) $('#ticket-add-model').addEventListener('click', () => {
      data = loadData();
      const brandInput = $('#ticket-new-brand-name');
      const brandNameValue = String(brandInput ? brandInput.value || '' : '').trim();
      const brandId = brandNameValue ? ensureBrand(data, brandNameValue) : $('#ticket-brand').value;
      const modelInput = $('#ticket-new-model-name');
      const message = $('#ticket-model-message');
      const modelNameValue = String(modelInput.value || '').trim();
      if(!brandId || !modelNameValue){
        message.textContent = 'Choose a brand, or type a new brand, then type the model name.';
        return;
      }
      const modelId = ensureModel(data, brandId, modelNameValue, $('#ticket-new-model-type').value || 'Phone');
      saveData(data);
      if($('#ticket-model-search')) $('#ticket-model-search').value = '';
      populateAllSelects();
      $('#ticket-brand').value = brandId;
      populateAllSelects();
      $('#ticket-model').value = modelId;
      if(brandInput) brandInput.value = '';
      modelInput.value = '';
      message.textContent = `${brandName(data, brandId)} ${modelNameValue} added and selected.`;
    });

    if($('#inventory-add-model')) $('#inventory-add-model').addEventListener('click', () => {
      data = loadData();
      const brandInput = $('#inventory-new-brand-name');
      const brandNameValue = String(brandInput ? brandInput.value || '' : '').trim();
      const brandId = brandNameValue ? ensureBrand(data, brandNameValue) : $('#inventory-brand').value;
      const modelInput = $('#inventory-new-model-name');
      const message = $('#inventory-model-message');
      const modelNameValue = String(modelInput.value || '').trim();
      if(!brandId || !modelNameValue){
        message.textContent = 'Choose a brand, or type a new brand, then type the model name.';
        return;
      }
      const modelId = ensureModel(data, brandId, modelNameValue, $('#inventory-new-model-type').value || 'Phone');
      saveData(data);
      if($('#inventory-model-search')) $('#inventory-model-search').value = '';
      populateAllSelects();
      $('#inventory-brand').value = brandId;
      populateAllSelects();
      $('#inventory-model').value = modelId;
      if(brandInput) brandInput.value = '';
      modelInput.value = '';
      message.textContent = `${brandName(data, brandId)} ${modelNameValue} added and selected.`;
    });

    if($('#inventory-search')) $('#inventory-search').addEventListener('input', renderInventory);
    if($('#inventory-filter-low')) $('#inventory-filter-low').addEventListener('change', renderInventory);
    if($('#model-stock-search')) $('#model-stock-search').addEventListener('input', renderModelStockCheck);
    if($('#clear-model-stock-search')) $('#clear-model-stock-search').addEventListener('click', () => {
      $('#model-stock-search').value = '';
      renderModelStockCheck();
    });

    if($('#order-inventory-part')) $('#order-inventory-part').addEventListener('change', () => {
      data = loadData();
      const item = data.inventory.find(entry => entry.id === $('#order-inventory-part').value);
      if(!item) return;
      const form = $('#order-form');
      form.elements.partName.value = item.partName || '';
      form.elements.qualityType.value = item.qualityType || '';
      form.elements.vendor.value = item.vendor || '';
      form.elements.orderCost.value = item.costPrice || '';
      form.elements.sellingPrice.value = item.sellingPrice || '';
    });

    function campaignLog(campaignId, status){
      return data.emailLog.filter(log => log.campaignId === campaignId && (!status || log.status === status));
    }

    function campaignDraftFromForm(){
      const form = $('#campaign-form');
      if(!form) return {};
      return Object.assign({
        campaignName:'',
        subject:'',
        message:'',
        discountType:'',
        discountAmount:'',
        couponCode:'',
        startDate:'',
        endDate:'',
        includeBrochure:'no',
        brochureHeadline:'',
        brochureDetails:'',
        brochureImageUrl:''
      }, formToObject(form));
    }

    function brochureMarkup(campaign){
      const headline = campaign.brochureHeadline || campaign.campaignName || campaign.subject || 'Fix & Chill Special Offer';
      const details = campaign.brochureDetails || campaign.message || 'Campaign details will appear here.';
      const offer = [campaign.discountAmount, campaign.discountType].filter(Boolean).join(' ') || campaign.couponCode || 'Special offer';
      const img = campaign.brochureImageUrl ? `<img src="${escapeHtml(campaign.brochureImageUrl)}" alt="${escapeHtml(headline)}">` : '<div class="fc-brochure-placeholder">Brochure image preview</div>';
      return `
        <div class="fc-brochure-art">
          <div class="fc-brochure-copy">
            <span class="fc-brochure-offer">${escapeHtml(offer)}</span>
            <h4>${escapeHtml(headline)}</h4>
            <p>${escapeHtml(details)}</p>
            <p><strong>Coupon:</strong> ${escapeHtml(campaign.couponCode || 'N/A')}</p>
            <p>${escapeHtml(campaign.startDate || 'Start date')} - ${escapeHtml(campaign.endDate || 'End date')}</p>
            <p>Fix & Chill Phone Repair · (302) 727-3842</p>
          </div>
          <div class="fc-brochure-image">${img}</div>
        </div>`;
    }

    function renderCampaignBrochurePreview(){
      const preview = $('#campaign-brochure-preview');
      if(!preview) return;
      const campaign = campaignDraftFromForm();
      preview.innerHTML = campaign.includeBrochure === 'yes'
        ? brochureMarkup(campaign)
        : '<div class="fc-alert">Brochure is currently not included. Select “Yes” to include it in this campaign.</div>';
    }

    function campaignRows(campaigns){
      if(!campaigns.length) return '<tr><td colspan="9">No campaigns yet.</td></tr>';
      return campaigns.map(campaign => {
        const targeted = campaignTargetCustomers(data, campaign).length;
        const sent = campaignLog(campaign.id, 'Sent').length;
        return `<tr>
          <td><strong>${escapeHtml(campaign.campaignName)}</strong><br><span class="fc-muted">${escapeHtml(campaign.subject)}</span></td>
          <td>${escapeHtml(campaign.couponCode)}</td>
          <td>${escapeHtml(campaign.startDate)}</td>
          <td>${escapeHtml(campaign.endDate)}</td>
          <td>${escapeHtml(campaign.sendDate)} ${escapeHtml(campaign.sendTime)}</td>
          <td>${statusPill(campaign.status)}</td>
          <td>${targeted}</td>
          <td>${sent}</td>
          <td class="fc-actions">
            <button class="fc-btn secondary" data-view-campaign="${campaign.id}">Open</button>
            <button class="fc-btn secondary" data-edit-campaign="${campaign.id}">Edit</button>
            ${campaign.status !== 'Sent' ? `<button class="fc-btn danger" data-cancel-campaign="${campaign.id}">Cancel</button>` : ''}
            <button class="fc-btn danger" data-delete-campaign="${campaign.id}">Delete</button>
          </td>
        </tr>`;
      }).join('');
    }

    function renderManualCustomerPicker(){
      const picker = $('#manual-customer-picker');
      if(!picker) return;
      const target = $('#campaign-target') ? $('#campaign-target').value : '';
      const showManual = target === 'Manual selected customers';
      const showDevice = target === 'Customers by device type';
      picker.hidden = !showManual;
      if($('#device-type-field')) $('#device-type-field').hidden = !showDevice;
      const selected = new Set();
      if(editing.campaign){
        const campaign = data.campaigns.find(entry => entry.id === editing.campaign);
        (campaign ? campaign.manualCustomerIds : []).forEach(id => selected.add(id));
      }
      picker.innerHTML = data.customers.length ? data.customers.map(customer => `
        <label class="fc-check-row">
          <input type="checkbox" name="manualCustomerIds" value="${escapeHtml(customer.id)}"${selected.has(customer.id) ? ' checked' : ''}>
          <span>${escapeHtml(customer.fullName)} · ${escapeHtml(customer.phone || 'no phone')} · ${customer.email ? escapeHtml(customer.email) : 'no email'}</span>
        </label>`).join('') : '<p class="fc-muted">Add customers before using manual selection.</p>';
      renderCampaignBrochurePreview();
    }

    function renderCampaigns(){
      if(!$('#campaigns-table')) return;
      $('#campaigns-table').innerHTML = campaignRows(data.campaigns.slice().reverse());
      renderEmailInfrastructurePanel();
      const detail = $('#campaign-detail');
      if(detail && detail.dataset.campaignId){
        renderCampaignDetail(detail.dataset.campaignId);
      }
    }

    function renderEmailInfrastructurePanel(){
      const panel = $('#email-infrastructure-panel');
      if(!panel) return;
      const pending = data.notificationQueue.filter(item => item.status === 'Pending provider setup');
      panel.innerHTML = `
        <h2>Email Delivery Infrastructure</h2>
        <div class="fc-alert">
          Automatic email sending is prepared but not connected yet. After we choose a provider, repair and campaign emails can be sent from here.
        </div>
        <div class="fc-grid three" style="margin-top:12px">
          <div class="fc-result-item"><span>Provider</span><strong>${escapeHtml(data.emailSettings.provider || 'Not selected')}</strong></div>
          <div class="fc-result-item"><span>From email</span><strong>${escapeHtml(data.emailSettings.fromEmail)}</strong></div>
          <div class="fc-result-item"><span>Pending repair notifications</span><strong>${pending.length}</strong></div>
        </div>`;
    }

    function chatWhatsappMessage(chat){
      return [
        'Fix & Chill chat handoff',
        `Customer: ${chat.customer.name || 'Unknown'}`,
        `Phone: ${chat.customer.phone || 'Not provided'}`,
        `Device: ${chat.customer.deviceModel || 'Not clear'}`,
        `Issue: ${chat.customer.issue || 'Not clear'}`,
        `Inventory: ${chat.inventoryResult.label || chat.inventoryResult.message || 'Unknown'}`,
        `Preferred time: ${chat.customer.preferredTime || 'Not provided'}`,
        `Summary: ${chat.summary || 'No summary yet'}`,
        `Open admin: ${location.origin}/admin/#chat-${chat.id}`
      ].join('\n');
    }

    function chatRows(chats){
      if(!chats.length) return '<tr><td colspan="6"><strong>No AI chatbot conversations saved in this browser yet.</strong><br><span class="fc-muted">On GitHub Pages this AI chat is local-browser storage only. A real customer on another phone/computer will not appear here until we connect an email/webhook/backend service. For live instant alerts right now, use Tawk notifications.</span></td></tr>';
      return chats.map(chat => `<tr>
        <td><strong>${escapeHtml(chat.customer.name || 'Unknown')}</strong><br><span class="fc-muted">${escapeHtml(chat.customer.phone || '')}</span></td>
        <td>${escapeHtml(chat.customer.deviceModel || 'Device unclear')}<br><span class="fc-muted">${escapeHtml(chat.customer.issue || '')}</span></td>
        <td>${statusPill(chat.inventoryResult.label || 'Unknown')}<br><span class="fc-muted">${escapeHtml(chat.inventoryResult.estimatedAvailability || '')}</span></td>
        <td>${statusPill(chat.status)}</td>
        <td>${escapeHtml(String(chat.updatedAt || '').slice(0, 19).replace('T', ' '))}</td>
        <td class="fc-actions">
          <button class="fc-btn secondary" data-open-chat="${chat.id}">Open</button>
          ${chat.status !== 'Closed' ? `<button class="fc-btn danger" data-close-chat="${chat.id}">Close</button>` : ''}
        </td>
      </tr>`).join('');
    }

    function renderChatDetail(chat){
      const detail = $('#chat-detail');
      if(!detail) return;
      if(!chat){
        detail.innerHTML = '<h2>Conversation Detail</h2><p class="fc-muted">Open a conversation to view transcript, summary, lead details, and handoff controls.</p><div class="fc-alert">Important: live customer messages from another device need Tawk or a connected email/webhook/backend service. Static GitHub Pages cannot receive those messages into admin by itself.</div>';
        return;
      }
      const whatsapp = whatsappLink(data.chatSettings, chatWhatsappMessage(chat));
      const transcript = chat.messages.length ? chat.messages.map(message => `<div class="fc-chat-line ${escapeHtml(message.sender)}"><strong>${escapeHtml(message.sender)} · ${escapeHtml(String(message.at || '').slice(0, 19).replace('T', ' '))}</strong>${escapeHtml(message.text)}</div>`).join('') : '<p class="fc-muted">No messages yet.</p>';
      detail.innerHTML = `
        <div class="fc-topline">
          <div>
            <h2>${escapeHtml(chat.customer.name || 'Chat Conversation')}</h2>
            <p class="fc-muted">${escapeHtml(chat.customer.phone || '')} · ${escapeHtml(chat.customer.deviceModel || 'Device unclear')}</p>
          </div>
          ${whatsapp ? `<a class="fc-btn accent" href="${escapeHtml(whatsapp)}" target="_blank" rel="noopener noreferrer">Open WhatsApp</a>` : ''}
        </div>
        <div class="fc-grid two">
          <div class="fc-result-item"><span>Status</span><strong>${statusPill(chat.status)}</strong></div>
          <div class="fc-result-item"><span>Inventory</span><strong>${escapeHtml(chat.inventoryResult.message || chat.inventoryResult.label || 'Unknown')}</strong></div>
          <div class="fc-result-item"><span>Preferred time</span><strong>${escapeHtml(chat.customer.preferredTime || 'Not provided')}</strong></div>
          <div class="fc-result-item"><span>Handoff reason</span><strong>${escapeHtml(chat.handoffReason || 'None')}</strong></div>
        </div>
        <h3>AI Summary</h3>
        <p>${escapeHtml(chat.summary || 'No summary yet.')}</p>
        <h3>Full Transcript</h3>
        <div class="fc-transcript">${transcript}</div>
        <div class="fc-actions" style="margin-top:12px">
          <button class="fc-btn" type="button" data-takeover-chat="${chat.id}">Take Over Conversation</button>
          <button class="fc-btn secondary" type="button" data-return-ai-chat="${chat.id}">Return to AI</button>
          <button class="fc-btn danger" type="button" data-close-chat="${chat.id}">Close</button>
        </div>
        <form class="fc-chat-compose" data-chat-reply-form="${chat.id}">
          <textarea name="message" placeholder="Type a technician message to the customer"></textarea>
          <button class="fc-btn accent" type="submit">Send</button>
        </form>
        <h3>Queued Notifications</h3>
        <div class="fc-table-wrap"><table class="fc-table"><tbody>${data.chatNotifications.filter(item => item.chatId === chat.id).slice().reverse().map(item => `<tr><td>${escapeHtml(item.createdAt)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.destination || '')}</td></tr>`).join('') || '<tr><td>No notifications queued for this conversation.</td></tr>'}</tbody></table></div>`;
    }

    function renderChatInbox(){
      if(!$('#chat-conversations-table')) return;
      const settingsForm = $('#chat-settings-form');
      if(settingsForm && document.activeElement && !settingsForm.contains(document.activeElement)) fillForm(settingsForm, data.chatSettings);
      const query = ($('#chat-search') ? $('#chat-search').value : '').toLowerCase().trim();
      const status = $('#chat-status-filter') ? $('#chat-status-filter').value : '';
      const chats = data.chatConversations.filter(chat => {
        const haystack = [chat.customer.name, chat.customer.phone, chat.customer.deviceModel, chat.customer.issue, chat.summary, chat.inventoryResult.label].join(' ').toLowerCase();
        return (!query || haystack.includes(query)) && (!status || chat.status === status);
      }).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      $('#chat-conversations-table').innerHTML = chatRows(chats);
      const waiting = chatNeedsReview(data).length;
      const active = data.chatConversations.filter(chat => chat.status === 'AI Chatting').length;
      const tech = data.chatConversations.filter(chat => chat.status === 'Technician Joined').length;
      const closed = data.chatConversations.filter(chat => chat.status === 'Closed').length;
      if($('#chat-stats')) $('#chat-stats').innerHTML = [
        ['Needs Human Review', waiting],
        ['AI Chatting', active],
        ['Technician Joined', tech],
        ['Closed', closed]
      ].map(([label, value]) => `<div class="fc-card fc-stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
      if(waiting > lastHandoffCount){
        if(window.Notification && Notification.permission === 'granted') new Notification('Fix & Chill chat handoff', {body:'A customer is waiting for human review.'});
        try{
          const audio = new (window.AudioContext || window.webkitAudioContext)();
          const osc = audio.createOscillator();
          osc.connect(audio.destination);
          osc.frequency.value = 880;
          osc.start();
          setTimeout(() => { osc.stop(); audio.close(); }, 140);
        }catch(e){}
      }
      lastHandoffCount = waiting;
      renderChatDetail(data.chatConversations.find(chat => chat.id === selectedChatId));
    }

    function renderCampaignDetail(campaignId){
      const detail = $('#campaign-detail');
      const campaign = data.campaigns.find(entry => entry.id === campaignId);
      if(!detail || !campaign){
        if(detail) detail.hidden = true;
        return;
      }
      const targets = campaignTargetCustomers(data, campaign);
      const sent = campaignLog(campaign.id, 'Sent');
      const failed = campaignLog(campaign.id, 'Failed');
      detail.hidden = false;
      detail.dataset.campaignId = campaignId;
      detail.innerHTML = `
        <div class="fc-topline">
          <div>
            <h2>${escapeHtml(campaign.campaignName)}</h2>
            <p class="fc-muted">${escapeHtml(campaign.subject)}</p>
          </div>
          <button class="fc-btn ghost" type="button" data-close-campaign-detail>Close</button>
        </div>
        <div class="fc-grid three">
          <div class="fc-result-item"><span>Status</span><strong>${statusPill(campaign.status)}</strong></div>
          <div class="fc-result-item"><span>Coupon</span><strong>${escapeHtml(campaign.couponCode || 'N/A')}</strong></div>
          <div class="fc-result-item"><span>Scheduled send</span><strong>${escapeHtml(campaign.sendDate)} ${escapeHtml(campaign.sendTime)}</strong></div>
          <div class="fc-result-item"><span>Offer window</span><strong>${escapeHtml(campaign.startDate)} to ${escapeHtml(campaign.endDate)}</strong></div>
          <div class="fc-result-item"><span>Targeted customers</span><strong>${targets.length}</strong></div>
          <div class="fc-result-item"><span>Emails sent / failed</span><strong>${sent.length} / ${failed.length}</strong></div>
        </div>
        <h3>Campaign Message</h3>
        <p>${escapeHtml(campaign.message)}</p>
        <h3>Brochure</h3>
        ${campaign.includeBrochure === 'yes' ? brochureMarkup(campaign) : '<p class="fc-muted">Brochure was not included in this campaign.</p>'}
        <h3>Target Customer List</h3>
        <div class="fc-table-wrap"><table class="fc-table"><tbody>${targets.length ? targets.map(customer => `<tr><td>${escapeHtml(customer.fullName)}</td><td>${escapeHtml(customer.phone || '')}</td><td>${escapeHtml(customer.email)}</td><td>${customer.emailConsent === 'yes' ? 'Email consent yes' : 'No email consent'}</td><td>${customer.unsubscribed === 'yes' ? 'Unsubscribed' : 'Subscribed'}</td></tr>`).join('') : '<tr><td>No customers match this target.</td></tr>'}</tbody></table></div>
        <h3>Sent Emails</h3>
        <div class="fc-table-wrap"><table class="fc-table"><tbody>${sent.length ? sent.map(log => `<tr><td>${escapeHtml(log.sentAt)}</td><td>${escapeHtml(log.customerName)}</td><td>${escapeHtml(log.email)}</td></tr>`).join('') : '<tr><td>No sent emails yet.</td></tr>'}</tbody></table></div>
        <h3>Failed Emails</h3>
        <div class="fc-table-wrap"><table class="fc-table"><tbody>${failed.length ? failed.map(log => `<tr><td>${escapeHtml(log.failedAt)}</td><td>${escapeHtml(log.customerName)}</td><td>${escapeHtml(log.email)}</td><td>${escapeHtml(log.error)}</td></tr>`).join('') : '<tr><td>No failed emails.</td></tr>'}</tbody></table></div>
        <h3>Email Preview</h3>
        <div class="fc-email-preview">${escapeHtml(sent[0] ? sent[0].emailBody : campaignEmailBody(campaign, targets[0] || {id:'preview', fullName:'Customer', email:''}))}</div>`;
    }

    if($('#chat-settings-form')) $('#chat-settings-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      data.chatSettings = Object.assign(data.chatSettings || {}, formToObject(event.currentTarget));
      saveData(data);
      const message = $('#chat-settings-message');
      message.className = 'wide fc-alert good';
      message.textContent = 'Chat notification settings saved. WhatsApp/email delivery is queued until a provider is connected.';
      message.hidden = false;
      render();
    });

    if($('#chat-search')) $('#chat-search').addEventListener('input', renderChatInbox);
    if($('#chat-status-filter')) $('#chat-status-filter').addEventListener('change', renderChatInbox);
    if($('#enable-browser-notifications')) $('#enable-browser-notifications').addEventListener('click', async () => {
      if(!window.Notification){
        alert('Browser notifications are not supported in this browser.');
        return;
      }
      const permission = await Notification.requestPermission();
      alert(permission === 'granted' ? 'Browser notifications enabled.' : 'Browser notifications were not enabled.');
    });

    document.addEventListener('submit', event => {
      const form = event.target;
      if(!form.dataset.chatReplyForm) return;
      event.preventDefault();
      data = loadData();
      const chat = data.chatConversations.find(entry => entry.id === form.dataset.chatReplyForm);
      const message = String(form.elements.message.value || '').trim();
      if(!chat || !message) return;
      chat.messages.push({sender:'owner', text:message, at:new Date().toISOString()});
      chat.status = 'Technician Joined';
      chat.aiEnabled = false;
      chat.customerUnread = true;
      chat.updatedAt = new Date().toISOString();
      saveData(data);
      form.reset();
      selectedChatId = chat.id;
      render();
    });

    $('#campaign-target').addEventListener('change', renderManualCustomerPicker);
    $('#campaign-form').addEventListener('input', renderCampaignBrochurePreview);
    $('#campaign-form').addEventListener('change', renderCampaignBrochurePreview);

    $('#campaign-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      processDueCampaigns(data);
      const values = formToObject(event.currentTarget);
      values.manualCustomerIds = $$('input[name="manualCustomerIds"]:checked').map(input => input.value);
      values.createdAt = today();
      const message = $('#campaign-message');
      if(values.status === 'Sent'){
        message.className = 'wide fc-alert bad';
        message.textContent = 'Create campaigns as Draft or Scheduled. Sent is reserved for campaigns after the send process runs.';
        message.hidden = false;
        return;
      }
      if(editing.campaign){
        const campaign = data.campaigns.find(entry => entry.id === editing.campaign);
        Object.assign(campaign, values);
      }else{
        data.campaigns.push(Object.assign({id:uid()}, values));
      }
      saveData(data);
      editing.campaign = null;
      $('#campaign-submit').textContent = 'Create Campaign';
      event.currentTarget.reset();
      $('#campaign-status').value = 'Draft';
      $('#campaign-include-brochure').value = 'no';
      message.className = 'wide fc-alert good';
      message.textContent = 'Campaign saved. Scheduled campaigns will only send after the selected send date and time.';
      message.hidden = false;
      render();
      renderCampaignBrochurePreview();
    });

    $('#campaign-reset').addEventListener('click', () => {
      editing.campaign = null;
      $('#campaign-submit').textContent = 'Create Campaign';
      $('#campaign-form').reset();
      $('#campaign-status').value = 'Draft';
      $('#campaign-include-brochure').value = 'no';
      $('#campaign-message').hidden = true;
      renderManualCustomerPicker();
      renderCampaignBrochurePreview();
    });

    $('#process-campaigns').addEventListener('click', () => {
      data = loadData();
      const result = processDueCampaigns(data);
      saveData(data);
      const message = $('#campaign-message');
      message.className = result.failed ? 'wide fc-alert bad' : 'wide fc-alert good';
      message.textContent = `Processed due campaigns. Sent: ${result.sent}. Failed: ${result.failed}.`;
      message.hidden = false;
      render();
    });

    function renderSearch(){
      const query = $('#global-search').value.toLowerCase().trim();
      if(!query){
        $('#search-results').innerHTML = '<p class="fc-muted">Search customers, tickets, device models, and part names.</p>';
        return;
      }
      const customers = data.customers.filter(customer => [customer.fullName, customer.phone, customer.email].join(' ').toLowerCase().includes(query));
      const tickets = data.tickets.filter(ticket => [ticket.ticketNumber, ticket.deviceModel, ticket.deviceBrand, ticket.problem].join(' ').toLowerCase().includes(query));
      const parts = data.inventory.filter(item => [brandName(data, item.brandId), modelName(data, item.deviceModelId), categoryName(data, item.partCategoryId), item.partName, item.qualityType, item.sku, item.barcode, item.vendor].join(' ').toLowerCase().includes(query));
      $('#search-results').innerHTML = `
        <h3>Customers</h3><div class="fc-table-wrap"><table class="fc-table"><tbody>${customerRows(customers)}</tbody></table></div>
        <h3>Tickets</h3><div class="fc-table-wrap"><table class="fc-table"><tbody>${ticketRows(tickets)}</tbody></table></div>
        <h3>Inventory</h3><div class="fc-table-wrap"><table class="fc-table"><tbody>${inventoryRows(parts)}</tbody></table></div>`;
    }
    $('#global-search').addEventListener('input', renderSearch);

    document.addEventListener('click', event => {
      const target = event.target;
      data = loadData();
      const customerId = target.dataset.editCustomer || target.dataset.deleteCustomer || target.dataset.useCustomer;
      const ticketId = target.dataset.editTicket || target.dataset.deleteTicket;
      const ticketPartId = target.dataset.ticketPart || target.dataset.editTicketPart;
      const orderId = target.dataset.editOrder || target.dataset.deleteOrder || target.dataset.installOrder;
      const inventoryId = target.dataset.editInventory || target.dataset.deleteInventory;
      const campaignId = target.dataset.viewCampaign || target.dataset.editCampaign || target.dataset.cancelCampaign || target.dataset.deleteCampaign;
      const chatId = target.dataset.openChat || target.dataset.takeoverChat || target.dataset.returnAiChat || target.dataset.closeChat;
      if(target.dataset.editCustomer || target.dataset.useCustomer){
        current = 'customers';
        render();
        data = loadData();
        startEditCustomer(customerId);
      }
      if(target.dataset.deleteCustomer && confirm('Delete this customer and their tickets/orders?')){
        const ticketIds = data.tickets.filter(ticket => ticket.customerId === customerId).map(ticket => ticket.id);
        data.customers = data.customers.filter(customer => customer.id !== customerId);
        data.tickets = data.tickets.filter(ticket => ticket.customerId !== customerId);
        data.orders = data.orders.filter(order => !ticketIds.includes(order.ticketId));
        saveData(data); render();
      }
      if(target.dataset.editTicket){
        current = 'tickets';
        editing.ticket = ticketId;
        render();
        data = loadData();
        fillForm($('#ticket-form'), ticketById(data, ticketId));
        populateAllSelects();
        fillForm($('#ticket-form'), ticketById(data, ticketId));
        if($('#ticket-new-payment-amount')) $('#ticket-new-payment-amount').value = '';
        if($('#ticket-saved-amount-paid')) $('#ticket-saved-amount-paid').value = toMoneyNumber((ticketById(data, ticketId) || {}).amountPaid).toFixed(2);
        updateTicketPaymentFields();
        updateTicketStockPreview();
        $('#ticket-submit').textContent = 'Update Ticket';
        $('#ticket-form').scrollIntoView({behavior:'smooth', block:'start'});
      }
      if(target.dataset.deleteTicket && confirm('Delete this repair ticket?')){
        data.tickets = data.tickets.filter(ticket => ticket.id !== ticketId);
        data.orders = data.orders.filter(order => order.ticketId !== ticketId);
        data.ticketParts = data.ticketParts.filter(part => part.ticketId !== ticketId);
        saveData(data); render();
      }
      if(target.dataset.editTicketPart){
        const part = data.ticketParts.find(entry => entry.id === ticketPartId);
        if(part){
          editing.ticketPart = ticketPartId;
          fillForm($('#ticket-required-part-form'), part);
          populateAllSelects();
          fillForm($('#ticket-required-part-form'), part);
          $('#required-part-submit').textContent = 'Update Required Part';
          current = 'tickets';
          render();
          fillForm($('#ticket-required-part-form'), part);
          $('#required-part-submit').textContent = 'Update Required Part';
          $('#ticket-required-part-form').scrollIntoView({behavior:'smooth', block:'start'});
        }
      }
      if(target.dataset.partAction){
        const result = applyTicketPartAction(ticketPartId, target.dataset.partAction);
        saveData(data);
        render();
        const message = $('#required-part-message');
        if(message){
          message.className = `wide fc-alert ${result.ok ? 'good' : 'bad'}`;
          message.textContent = result.message;
          message.hidden = false;
        }
      }
      if(target.dataset.editOrder){
        editing.order = orderId;
        fillForm($('#order-form'), data.orders.find(order => order.id === orderId));
        populateAllSelects();
        fillForm($('#order-form'), data.orders.find(order => order.id === orderId));
        $('#order-submit').textContent = 'Update Part Order';
        window.scrollTo({top:0, behavior:'smooth'});
      }
      if(target.dataset.installOrder){
        $('#install-order').value = orderId;
        current = 'orders';
        render();
      }
      if(target.dataset.deleteOrder && confirm('Delete this part order? Received/installed stock changes are kept in history.')){
        data.orders = data.orders.filter(order => order.id !== orderId);
        saveData(data); render();
      }
      if(target.dataset.editInventory){
        editing.inventory = inventoryId;
        fillForm($('#inventory-form'), data.inventory.find(item => item.id === inventoryId));
        populateAllSelects();
        fillForm($('#inventory-form'), data.inventory.find(item => item.id === inventoryId));
        $('#inventory-submit').textContent = 'Update Inventory Item';
        window.scrollTo({top:0, behavior:'smooth'});
      }
      if(target.dataset.deleteInventory && confirm('Delete this inventory item?')){
        data.inventory = data.inventory.filter(item => item.id !== inventoryId);
        saveData(data); render();
      }
      if(target.dataset.openChat){
        selectedChatId = chatId;
        current = 'chat-inbox';
        const chat = data.chatConversations.find(entry => entry.id === chatId);
        if(chat) chat.ownerUnread = false;
        saveData(data);
        render();
      }
      if(target.dataset.takeoverChat){
        const chat = data.chatConversations.find(entry => entry.id === chatId);
        if(chat){
          selectedChatId = chat.id;
          chat.status = 'Technician Joined';
          chat.aiEnabled = false;
          chat.messages.push({sender:'system', text:'Technician joined the conversation.', at:new Date().toISOString()});
          chat.updatedAt = new Date().toISOString();
          saveData(data); render();
        }
      }
      if(target.dataset.returnAiChat){
        const chat = data.chatConversations.find(entry => entry.id === chatId);
        if(chat){
          selectedChatId = chat.id;
          chat.status = 'AI Chatting';
          chat.aiEnabled = true;
          chat.messages.push({sender:'system', text:'AI assistant is back to help with the next steps.', at:new Date().toISOString()});
          chat.updatedAt = new Date().toISOString();
          saveData(data); render();
        }
      }
      if(target.dataset.closeChat){
        const chat = data.chatConversations.find(entry => entry.id === chatId);
        if(chat){
          selectedChatId = chat.id;
          chat.status = 'Closed';
          chat.aiEnabled = false;
          chat.updatedAt = new Date().toISOString();
          saveData(data); render();
        }
      }
      if(target.dataset.viewCampaign){
        renderCampaignDetail(campaignId);
      }
      if(target.dataset.editCampaign){
        const campaign = data.campaigns.find(entry => entry.id === campaignId);
        editing.campaign = campaignId;
        fillForm($('#campaign-form'), campaign);
        $('#campaign-submit').textContent = 'Update Campaign';
        renderManualCustomerPicker();
        current = 'campaigns';
        render();
        fillForm($('#campaign-form'), campaign);
        renderManualCustomerPicker();
        renderCampaignBrochurePreview();
        window.scrollTo({top:0, behavior:'smooth'});
      }
      if(target.dataset.cancelCampaign && confirm('Cancel this campaign? It will not send after cancellation.')){
        const campaign = data.campaigns.find(entry => entry.id === campaignId);
        if(campaign && campaign.status !== 'Sent') campaign.status = 'Cancelled';
        saveData(data); render();
      }
      if(target.dataset.deleteCampaign && confirm('Delete this campaign and its email logs?')){
        data.campaigns = data.campaigns.filter(campaign => campaign.id !== campaignId);
        data.emailLog = data.emailLog.filter(log => log.campaignId !== campaignId);
        saveData(data); render();
      }
      if(target.dataset.closeCampaignDetail !== undefined){
        const detail = $('#campaign-detail');
        detail.hidden = true;
        detail.dataset.campaignId = '';
      }
    });

    $('#seed-workflow').addEventListener('click', () => {
      data = defaultData();
      const appleId = ensureBrand(data, 'Apple');
      const iphone14Id = ensureModel(data, appleId, 'iPhone 14', 'Phone');
      const screenCatId = ensureCategory(data, 'Screen');
      const customer = {id:uid(), fullName:'Test Customer', phone:'3025550199', email:'test@example.com', address:'Rehoboth Beach, DE', notes:'Workflow test customer', emailConsent:'yes', smsConsent:'no', unsubscribed:'no', createdAt:today()};
      const ticket = {id:uid(), ticketNumber:'FC-1001', customerId:customer.id, brandId:appleId, deviceModelId:iphone14Id, deviceBrand:'Apple', deviceModel:'iPhone 14', serial:'IMEI123456789', problem:'Cracked screen', estimatedPrice:'149', finalPrice:'149', amountPaid:'149', refundType:'None', refundAmount:'0', status:'Item Ordered', estimatedCompletion:today(), publicMessage:'Your repair is moving through our shop workflow.', technicianNotes:'Private diagnosis note', createdAt:today(), completedAt:''};
      const order = {id:uid(), ticketId:ticket.id, ticketNumber:ticket.ticketNumber, brandId:appleId, deviceModelId:iphone14Id, deviceModel:ticket.deviceModel, partCategoryId:screenCatId, partName:'iPhone 14 Screen', qualityType:'Soft OLED', partCategory:'Screen', vendor:'Demo Supplier', orderCost:'72', sellingPrice:'149', quantity:1, trackingNumber:'TRACK123', estimatedArrival:today(), receivedDate:'', status:'Ordered', receivedApplied:false, installedApplied:false, createdAt:today()};
      data.nextTicket = 1002;
      data.customers.push(customer);
      data.tickets.push(ticket);
      data.orders.push(order);
      saveData(data);
      render();
      alert('Workflow test data created through Step 4. Edit the order to Received, then install it to complete Steps 5-8.');
    });

    if(location.hash && location.hash.startsWith('#chat-')){
      selectedChatId = location.hash.replace('#chat-', '');
      current = 'chat-inbox';
    }
    showApp();
  }

  function initTracking(){
    const form = $('#track-form');
    const result = $('#track-result');
    const error = $('#track-error');
    if(!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = loadData();
      const values = formToObject(form);
      const ticketNumber = values.ticketNumber.toUpperCase();
      const phone = values.phone.replace(/\D/g, '');
      const name = values.lastName.toLowerCase().trim();
      const ticket = data.tickets.find(entry => {
        const customer = customerById(data, entry.customerId);
        if(!customer) return false;
        const phoneMatches = phone && customer.phone.replace(/\D/g, '').includes(phone);
        const lastNameMatches = name && lastName(customer.fullName) === name;
        const ticketMatches = ticketNumber && entry.ticketNumber.toUpperCase() === ticketNumber;
        return (ticketMatches && (phoneMatches || lastNameMatches)) || (phoneMatches && lastNameMatches);
      });
      if(!ticket){
        result.hidden = true;
        error.hidden = false;
        return;
      }
      error.hidden = true;
      result.hidden = false;
      result.innerHTML = `
        <div class="fc-card">
          <h2>Repair Status</h2>
          <div class="fc-result-grid">
            <div class="fc-result-item"><span>Ticket number</span><strong>${escapeHtml(ticket.ticketNumber)}</strong></div>
            <div class="fc-result-item"><span>Device</span><strong>${escapeHtml(ticket.deviceBrand)} ${escapeHtml(ticket.deviceModel)}</strong></div>
            <div class="fc-result-item"><span>Status</span><strong>${statusPill(ticket.status)}</strong></div>
            <div class="fc-result-item"><span>Estimated completion</span><strong>${escapeHtml(ticket.estimatedCompletion || 'We will update this soon')}</strong></div>
          </div>
          <p><strong>Message from Fix & Chill:</strong><br>${escapeHtml(ticket.publicMessage || 'Thanks for choosing Fix & Chill. We will update your repair status as work continues.')}</p>
        </div>`;
    });
  }

  function initUnsubscribe(){
    const result = $('#unsubscribe-result');
    if(!result) return;
    const params = new URLSearchParams(location.search);
    const customerId = params.get('customer');
    const data = loadData();
    const customer = customerById(data, customerId);
    if(!customer){
      result.className = 'fc-alert bad';
      result.textContent = 'We could not find this email preference record. Please contact Fix & Chill Phone Repair for help.';
      return;
    }
    customer.unsubscribed = 'yes';
    customer.emailConsent = 'no';
    saveData(data);
    result.className = 'fc-alert good';
    result.textContent = 'You have been unsubscribed from Fix & Chill Phone Repair marketing emails.';
  }

  document.addEventListener('DOMContentLoaded', () => {
    if($('#fc-admin-app')) initAdmin();
    initTracking();
    initUnsubscribe();
  });
})();
