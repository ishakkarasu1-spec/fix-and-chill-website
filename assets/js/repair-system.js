(function(){
  'use strict';

  const STORE_KEY = 'fixChillRepairManager.v1';
  const SESSION_KEY = 'fixChillAdminSession';
  const ADMIN_EMAIL = 'owner@fixandchill.local';
  const ADMIN_PASSWORD = 'FixChill2026!';

  const repairStatuses = [
    'Booked','Device Received','Diagnosis','Part Ordered','Waiting for Part','Part Received',
    'Scheduled Visit','In Repair','Ready for Pickup','Completed','Delivered','Cancelled'
  ];
  const orderStatuses = ['Not Ordered','Ordered','Shipped','Received','Cancelled'];
  const defaultBrandNames = ['Apple','Samsung','Google','Motorola','OnePlus','iPad','Laptop'];
  const defaultPartCategoryNames = ['Screen','Battery','Charging Port','Back Glass','Front Camera','Rear Camera','Speaker','Earpiece Speaker','Microphone','Housing','Flex Cable','Face ID Parts','Buttons','SIM Tray','Adhesive','Other'];
  const deviceTypes = ['Phone','Tablet','Laptop','Game Console'];
  const qualityTypes = ['Aftermarket','Premium','Soft OLED','Hard OLED','Original Pull','Refurbished','OEM','High Capacity'];
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
  const slug = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || uid();

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
      campaigns:[],
      emailLog:[],
      notificationQueue:[],
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

  function categoryName(data, id){
    return (categoryById(data, id) || {}).categoryName || '';
  }

  function deviceLabel(data, brandId, modelId){
    return `${brandName(data, brandId)} ${modelName(data, modelId)}`.trim();
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

    data.tickets.forEach(ticket => {
      if(!ticket.brandId && ticket.deviceBrand) ticket.brandId = ensureBrand(data, ticket.deviceBrand);
      if(!ticket.deviceModelId && ticket.deviceModel) ticket.deviceModelId = ensureModel(data, ticket.brandId || ensureBrand(data, ticket.deviceBrand || 'Other'), ticket.deviceModel, 'Phone');
      ticket.deviceBrand = ticket.deviceBrand || brandName(data, ticket.brandId);
      ticket.deviceModel = ticket.deviceModel || modelName(data, ticket.deviceModelId);
    });

    data.inventory.forEach(item => {
      if(!item.brandId) item.brandId = ensureBrand(data, item.brandName || '');
      if(!item.brandId && item.compatibleDeviceModel) item.brandId = ensureBrand(data, 'Other');
      if(!item.deviceModelId) item.deviceModelId = ensureModel(data, item.brandId, item.modelName || item.compatibleDeviceModel || '', 'Phone');
      if(!item.partCategoryId) item.partCategoryId = ensureCategory(data, item.categoryName || item.partCategory || 'Other');
      item.qualityType = item.qualityType || item.quality_type || '';
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
    return `${ticket.ticketNumber} - ${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}`.trim();
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

  function populateModelsForBrand(select, data, brandId, selected){
    const models = data.deviceModels.filter(model => !brandId || model.brandId === brandId);
    populateSelect(select, models, model => model.id, model => `${model.modelName} (${model.deviceType})`, selected);
  }

  function inventoryPartLabel(data, item){
    return `${item.partName} - ${item.qualityType || 'Standard'} - ${item.quantityInStock} in stock`;
  }

  function compatibleInventoryParts(data, ticketOrModelId, categoryId){
    const modelId = typeof ticketOrModelId === 'string' ? ticketOrModelId : ticketOrModelId && ticketOrModelId.deviceModelId;
    return data.inventory.filter(item =>
      item.deviceModelId === modelId &&
      (!categoryId || item.partCategoryId === categoryId) &&
      Number(item.quantityInStock || 0) > 0
    );
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
    const good = ['Received','Ready for Pickup','Completed','Delivered','Part Received','Sent'].includes(status);
    const bad = ['Cancelled'].includes(status);
    const warn = ['Booked','Waiting for Part','Part Ordered','Ordered','Shipped','Diagnosis','Draft','Scheduled','Expired'].includes(status);
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
    let editing = {customer:null,ticket:null,order:null,inventory:null,campaign:null};
    let campaignTimer = null;

    function signedIn(){
      return sessionStorage.getItem(SESSION_KEY) === 'yes';
    }

    function showApp(){
      login.style.display = signedIn() ? 'none' : 'grid';
      app.style.display = signedIn() ? 'grid' : 'none';
      if(signedIn()){
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
        $('#login-error').hidden = true;
        showApp();
      }else{
        $('#login-error').hidden = false;
      }
    });

    $('.fc-logout').addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
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
      renderOrders();
      renderInventory();
      renderCampaigns();
      renderSearch();
      populateAllSelects();
    }

    function populateAllSelects(){
      populateSelect($('#ticket-customer'), data.customers, customer => customer.id, customerLabel, $('#ticket-customer').value);
      populateSelect($('#ticket-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#ticket-brand').value);
      populateModelsForBrand($('#ticket-model'), data, $('#ticket-brand').value, $('#ticket-model').value);
      populatePlainSelect($('#ticket-new-model-type'), deviceTypes, $('#ticket-new-model-type') ? $('#ticket-new-model-type').value || 'Phone' : 'Phone');
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
      populateSelect($('#ticket-part-category'), data.partCategories, category => category.id, category => category.categoryName, $('#ticket-part-category').value);
      const selectedTicket = ticketById(data, $('#ticket-part-ticket') ? $('#ticket-part-ticket').value : '');
      populateSelect($('#ticket-part-inventory'), compatibleInventoryParts(data, selectedTicket, $('#ticket-part-category') ? $('#ticket-part-category').value : ''), item => item.id, item => inventoryPartLabel(data, item), $('#ticket-part-inventory') ? $('#ticket-part-inventory').value : '');
      populateSelect($('#catalog-model-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#catalog-model-brand').value);
      populatePlainSelect($('#catalog-device-type'), deviceTypes, $('#catalog-device-type').value || 'Phone');
      populateSelect($('#inventory-brand'), data.brands, brand => brand.id, brand => brand.brandName, $('#inventory-brand').value);
      populateModelsForBrand($('#inventory-model'), data, $('#inventory-brand').value, $('#inventory-model').value);
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
      const activeRepairs = data.tickets.filter(ticket => !['Completed','Delivered','Cancelled'].includes(ticket.status)).length;
      const waiting = data.tickets.filter(ticket => ['Part Ordered','Waiting for Part'].includes(ticket.status)).length;
      const received = data.orders.filter(order => order.status === 'Received' && !order.installedApplied).length;
      const ready = data.tickets.filter(ticket => ticket.status === 'Ready for Pickup').length;
      const low = data.inventory.filter(item => Number(item.quantityInStock || 0) <= Number(item.lowStockAlertQuantity || 0));
      $('#dashboard-stats').innerHTML = [
        ['Total active repairs', activeRepairs],
        ['Repairs waiting for parts', waiting],
        ['Parts received', received],
        ['Ready for pickup', ready],
        ['Low stock items', low.length]
      ].map(([label, value]) => `<div class="fc-card fc-stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
      $('#recent-tickets').innerHTML = ticketRows(data.tickets.slice().reverse().slice(0, 8));
      $('#low-stock-list').innerHTML = low.length ? low.map(item => `<tr><td>${escapeHtml(item.partName)}</td><td>${escapeHtml(brandName(data, item.brandId))}</td><td>${escapeHtml(modelName(data, item.deviceModelId))}</td><td>${item.quantityInStock}</td><td>${item.lowStockAlertQuantity}</td></tr>`).join('') : '<tr><td colspan="5">No low stock warnings.</td></tr>';
    }

    function customerRows(customers){
      if(!customers.length) return '<tr><td colspan="8">No customers yet.</td></tr>';
      return customers.map(customer => `
        <tr>
          <td><strong>${escapeHtml(customer.fullName)}</strong></td>
          <td>${escapeHtml(customer.phone)}</td>
          <td>${escapeHtml(customer.email)}</td>
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

    $('#customer-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      if(editing.customer){
        Object.assign(customerById(data, editing.customer), values);
      }else{
        data.customers.push(Object.assign({id:uid(), createdAt:today()}, values));
      }
      saveData(data);
      editing.customer = null;
      $('#customer-submit').textContent = 'Add Customer';
      event.currentTarget.reset();
      render();
    });

    $('#customer-reset').addEventListener('click', () => {
      editing.customer = null;
      $('#customer-submit').textContent = 'Add Customer';
      $('#customer-form').reset();
    });

    $('#customer-search').addEventListener('input', renderCustomers);

    function ticketRows(tickets){
      if(!tickets.length) return '<tr><td colspan="10">No repair tickets yet.</td></tr>';
      return tickets.map(ticket => {
        const customer = customerById(data, ticket.customerId);
        return `<tr>
          <td><strong>${escapeHtml(ticket.ticketNumber)}</strong></td>
          <td>${escapeHtml(fullName(customer))}<br><span class="fc-muted">${escapeHtml(customer ? customer.phone : '')}</span></td>
          <td>${escapeHtml(deviceLabel(data, ticket.brandId, ticket.deviceModelId) || `${ticket.deviceBrand || ''} ${ticket.deviceModel || ''}`.trim())}<br><span class="fc-muted">${escapeHtml(ticket.serial)}</span></td>
          <td>${escapeHtml(ticket.problem)}</td>
          <td>${statusPill(ticket.status)}</td>
          <td>${escapeHtml(ticket.estimatedCompletion)}</td>
          <td>$${money(ticket.estimatedPrice)}</td>
          <td>$${money(ticket.finalPrice)}</td>
          <td>${escapeHtml(ticket.createdAt)}</td>
          <td class="fc-actions">
            <button class="fc-btn secondary" data-edit-ticket="${ticket.id}">Edit</button>
            <button class="fc-btn danger" data-delete-ticket="${ticket.id}">Delete</button>
          </td>
        </tr>`;
      }).join('');
    }

    function renderTickets(){
      const query = $('#ticket-search').value.toLowerCase();
      const tickets = data.tickets.filter(ticket => {
        const customer = customerById(data, ticket.customerId);
        return [ticket.ticketNumber, modelName(data, ticket.deviceModelId), brandName(data, ticket.brandId), ticket.deviceModel, ticket.deviceBrand, customer && customer.fullName, customer && customer.phone].join(' ').toLowerCase().includes(query);
      });
      $('#tickets-table').innerHTML = ticketRows(tickets);
    }

    $('#ticket-form').addEventListener('submit', event => {
      event.preventDefault();
      data = loadData();
      const values = formToObject(event.currentTarget);
      if(editing.ticket){
        const ticket = ticketById(data, editing.ticket);
        values.deviceBrand = brandName(data, values.brandId);
        values.deviceModel = modelName(data, values.deviceModelId);
        Object.assign(ticket, values);
        ticket.completedAt = ['Completed','Delivered'].includes(ticket.status) ? (ticket.completedAt || today()) : '';
        queueRepairEmailNotification(data, ticket);
      }else{
        values.deviceBrand = brandName(data, values.brandId);
        values.deviceModel = modelName(data, values.deviceModelId);
        values.ticketNumber = `FC-${data.nextTicket++}`;
        values.createdAt = today();
        values.completedAt = ['Completed','Delivered'].includes(values.status) ? today() : '';
        const ticket = Object.assign({id:uid()}, values);
        data.tickets.push(ticket);
        queueRepairEmailNotification(data, ticket);
      }
      saveData(data);
      editing.ticket = null;
      $('#ticket-submit').textContent = 'Create Ticket';
      event.currentTarget.reset();
      $('#ticket-status').value = 'Booked';
      render();
    });

    $('#ticket-reset').addEventListener('click', () => {
      editing.ticket = null;
      $('#ticket-submit').textContent = 'Create Ticket';
      $('#ticket-form').reset();
      $('#ticket-status').value = 'Booked';
    });

    $('#ticket-search').addEventListener('input', renderTickets);

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
      ticket.status = shouldComplete ? 'Completed' : 'In Repair';
      ticket.completedAt = shouldComplete ? today() : ticket.completedAt;
      saveData(data);
      message.className = 'fc-alert good';
      message.textContent = 'Part installed and inventory decreased.';
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
        ticket.status = 'Completed';
        ticket.completedAt = today();
      }
      saveData(data);
      message.className = 'wide fc-alert good';
      message.textContent = 'Compatible part installed and inventory decreased.';
      message.hidden = false;
      event.currentTarget.reset();
      render();
    });

    ['ticket-brand','order-brand','order-device-model','order-category','order-inventory-part','ticket-part-ticket','ticket-part-category','inventory-brand','inventory-filter-brand','inventory-filter-model','inventory-filter-category'].forEach(id => {
      const element = $(`#${id}`);
      if(element) element.addEventListener('change', () => {
        if(id === 'ticket-brand') $('#ticket-model').value = '';
        if(id === 'order-brand') $('#order-device-model').value = '';
        if(id === 'inventory-brand') $('#inventory-model').value = '';
        if(id === 'inventory-filter-brand') $('#inventory-filter-model').value = '';
        data = loadData();
        populateAllSelects();
        renderInventory();
      });
    });

    if($('#ticket-add-model')) $('#ticket-add-model').addEventListener('click', () => {
      data = loadData();
      const brandId = $('#ticket-brand').value;
      const modelInput = $('#ticket-new-model-name');
      const message = $('#ticket-model-message');
      const modelNameValue = String(modelInput.value || '').trim();
      if(!brandId || !modelNameValue){
        message.textContent = 'Choose a brand and type the model name first.';
        return;
      }
      const modelId = ensureModel(data, brandId, modelNameValue, $('#ticket-new-model-type').value || 'Phone');
      saveData(data);
      populateAllSelects();
      $('#ticket-model').value = modelId;
      modelInput.value = '';
      message.textContent = `${modelNameValue} added and selected.`;
    });

    if($('#inventory-search')) $('#inventory-search').addEventListener('input', renderInventory);
    if($('#inventory-filter-low')) $('#inventory-filter-low').addEventListener('change', renderInventory);

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
          Real automatic email sending is prepared but not connected yet. Choose a provider later, such as SendGrid, Mailgun, Resend, Amazon SES, or Laravel Mail.
        </div>
        <div class="fc-grid three" style="margin-top:12px">
          <div class="fc-result-item"><span>Provider</span><strong>${escapeHtml(data.emailSettings.provider || 'Not selected')}</strong></div>
          <div class="fc-result-item"><span>From email</span><strong>${escapeHtml(data.emailSettings.fromEmail)}</strong></div>
          <div class="fc-result-item"><span>Pending repair notifications</span><strong>${pending.length}</strong></div>
        </div>
        <h3>Queued Repair Ticket Emails</h3>
        <div class="fc-table-wrap"><table class="fc-table"><tbody>${pending.length ? pending.slice().reverse().map(item => `<tr><td>${escapeHtml(item.createdAt)}</td><td>${escapeHtml(item.ticketNumber)}</td><td>${escapeHtml(item.customerName)}</td><td>${escapeHtml(item.email)}</td><td>${escapeHtml(item.status)}</td></tr>`).join('') : '<tr><td>No pending repair email notifications.</td></tr>'}</tbody></table></div>`;
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
      const customerId = target.dataset.editCustomer || target.dataset.deleteCustomer;
      const ticketId = target.dataset.editTicket || target.dataset.deleteTicket;
      const orderId = target.dataset.editOrder || target.dataset.deleteOrder || target.dataset.installOrder;
      const inventoryId = target.dataset.editInventory || target.dataset.deleteInventory;
      const campaignId = target.dataset.viewCampaign || target.dataset.editCampaign || target.dataset.cancelCampaign || target.dataset.deleteCampaign;
      if(target.dataset.editCustomer){
        editing.customer = customerId;
        fillForm($('#customer-form'), customerById(data, customerId));
        $('#customer-submit').textContent = 'Update Customer';
        window.scrollTo({top:0, behavior:'smooth'});
      }
      if(target.dataset.deleteCustomer && confirm('Delete this customer and their tickets/orders?')){
        const ticketIds = data.tickets.filter(ticket => ticket.customerId === customerId).map(ticket => ticket.id);
        data.customers = data.customers.filter(customer => customer.id !== customerId);
        data.tickets = data.tickets.filter(ticket => ticket.customerId !== customerId);
        data.orders = data.orders.filter(order => !ticketIds.includes(order.ticketId));
        saveData(data); render();
      }
      if(target.dataset.editTicket){
        editing.ticket = ticketId;
        fillForm($('#ticket-form'), ticketById(data, ticketId));
        populateAllSelects();
        fillForm($('#ticket-form'), ticketById(data, ticketId));
        $('#ticket-submit').textContent = 'Update Ticket';
        window.scrollTo({top:0, behavior:'smooth'});
      }
      if(target.dataset.deleteTicket && confirm('Delete this repair ticket?')){
        data.tickets = data.tickets.filter(ticket => ticket.id !== ticketId);
        data.orders = data.orders.filter(order => order.ticketId !== ticketId);
        saveData(data); render();
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
      const ticket = {id:uid(), ticketNumber:'FC-1001', customerId:customer.id, brandId:appleId, deviceModelId:iphone14Id, deviceBrand:'Apple', deviceModel:'iPhone 14', serial:'IMEI123456789', problem:'Cracked screen', estimatedPrice:'149', finalPrice:'149', status:'Part Ordered', estimatedCompletion:today(), publicMessage:'Your repair is moving through our shop workflow.', technicianNotes:'Private diagnosis note', createdAt:today(), completedAt:''};
      const order = {id:uid(), ticketId:ticket.id, ticketNumber:ticket.ticketNumber, brandId:appleId, deviceModelId:iphone14Id, deviceModel:ticket.deviceModel, partCategoryId:screenCatId, partName:'iPhone 14 Screen', qualityType:'Soft OLED', partCategory:'Screen', vendor:'Demo Supplier', orderCost:'72', sellingPrice:'149', quantity:1, trackingNumber:'TRACK123', estimatedArrival:today(), receivedDate:'', status:'Ordered', receivedApplied:false, installedApplied:false, createdAt:today()};
      data.nextTicket = 1002;
      data.customers.push(customer);
      data.tickets.push(ticket);
      data.orders.push(order);
      saveData(data);
      render();
      alert('Workflow test data created through Step 4. Edit the order to Received, then install it to complete Steps 5-8.');
    });

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
      const name = values.lastName.toLowerCase();
      const ticket = data.tickets.find(entry => {
        const customer = customerById(data, entry.customerId);
        if(ticketNumber && entry.ticketNumber.toUpperCase() === ticketNumber) return true;
        return customer && phone && name && customer.phone.replace(/\D/g, '').includes(phone) && lastName(customer.fullName) === name;
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
