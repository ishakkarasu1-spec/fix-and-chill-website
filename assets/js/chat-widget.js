(function(){
  'use strict';

  const STORE_KEY = 'fixChillRepairManager.v1';
  const CHAT_ID_KEY = 'fixChillActiveChatId';
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const now = () => new Date().toISOString();
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

  const defaultData = () => ({
    brands:[],
    deviceModels:[],
    partCategories:[],
    inventory:[],
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
    }
  });

  function loadData(){
    try{
      const data = Object.assign(defaultData(), JSON.parse(localStorage.getItem(STORE_KEY) || '{}'));
      data.chatConversations = data.chatConversations || [];
      data.chatLeads = data.chatLeads || [];
      data.chatNotifications = data.chatNotifications || [];
      data.chatSettings = Object.assign(defaultData().chatSettings, data.chatSettings || {});
      data.inventory = data.inventory || [];
      data.deviceModels = data.deviceModels || [];
      data.partCategories = data.partCategories || [];
      return data;
    }catch(e){
      return defaultData();
    }
  }

  function saveData(data){
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function modelName(data, id){
    return (data.deviceModels.find(model => model.id === id) || {}).modelName || '';
  }

  function categoryName(data, id){
    return (data.partCategories.find(category => category.id === id) || {}).categoryName || '';
  }

  function normalizeLookup(value){
    return String(value || '')
      .toLowerCase()
      .replace(/\b(apple|samsung|google|motorola|oneplus|phone|cell|mobile)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inferRepairCategory(issue){
    const text = String(issue || '').toLowerCase();
    if(/screen|glass|lcd|oled|display|crack/.test(text)) return 'Screen';
    if(/battery|dies fast|drain|charging slow/.test(text)) return 'Battery';
    if(/charging port|charge port|charger|not charging|usb/.test(text)) return 'Charging Port';
    if(/back glass|rear glass/.test(text)) return 'Back Glass';
    if(/water|liquid/.test(text)) return 'Diagnostics';
    if(/no power|motherboard|board/.test(text)) return 'Diagnostics';
    if(/camera/.test(text)) return text.includes('front') ? 'Front Camera' : 'Rear Camera';
    if(/speaker|earpiece/.test(text)) return text.includes('ear') ? 'Earpiece Speaker' : 'Speaker';
    if(/microphone|mic/.test(text)) return 'Microphone';
    return 'Other';
  }

  function inventoryCheck(data, deviceModel, issue){
    const modelText = normalizeLookup(deviceModel);
    const categoryText = inferRepairCategory(issue).toLowerCase();
    const matches = data.inventory.filter(item => {
      const model = normalizeLookup(modelName(data, item.deviceModelId));
      const category = categoryName(data, item.partCategoryId).toLowerCase();
      const part = String(item.partName || '').toLowerCase();
      const modelMatch = modelText && (model.includes(modelText) || modelText.includes(model));
      return modelMatch && (category === categoryText || part.includes(categoryText) || categoryText === 'diagnostics' || categoryText === 'other');
    });
    const inStock = matches.find(item => Number(item.quantityInStock || 0) > 0);
    if(inStock){
      return {
        status:'in_stock',
        label:`In stock: ${inStock.quantityInStock}`,
        message:`The ${inStock.partName} appears available in inventory right now.`,
        partName:inStock.partName,
        price:inStock.sellingPrice || '',
        estimatedAvailability:'Available now'
      };
    }
    if(matches.length){
      const item = matches[0];
      return {
        status:'out_of_stock',
        label:'Out of stock',
        message:'That part is listed in inventory, but the current stock is 0. It may need to be ordered, or the stock may need a technician to double-check it.',
        partName:item.partName,
        price:item.sellingPrice || '',
        estimatedAvailability:item.notes && /eta|arrival|shipping|day/i.test(item.notes) ? item.notes : supplierShippingEstimate()
      };
    }
    return {
      status:'not_found',
      label:'Part not found in inventory',
      message:'I could not find a matching part in inventory. It may not have been added yet, so I will ask a technician to confirm availability before any appointment is approved.',
      partName:'',
      price:'',
      estimatedAvailability:'Unknown'
    };
  }

  function supplierShippingEstimate(date=new Date()){
    const day = date.getDay();
    if(day === 5) return 'If the order is placed Friday with overnight shipping, it may arrive Saturday when the supplier offers Saturday delivery.';
    if(day === 6 || day === 0) return 'Orders placed Saturday or Sunday usually arrive Tuesday.';
    return 'Supplier timing depends on cut-off time and shipping option. A technician will confirm availability before booking.';
  }

  function withinWorkingHours(settings){
    const current = new Date();
    const [sh, sm] = String(settings.workStart || '10:00').split(':').map(Number);
    const [eh, em] = String(settings.workEnd || '19:00').split(':').map(Number);
    const start = new Date(current);
    start.setHours(sh || 10, sm || 0, 0, 0);
    const end = new Date(current);
    end.setHours(eh || 19, em || 0, 0, 0);
    return current >= start && current <= end;
  }

  function shouldHandoff(text, conversation, inventoryResult){
    const lower = String(text || '').toLowerCase();
    if(/human|technician|owner|person|call me|talk to/i.test(lower)) return 'Customer asked for a human.';
    if(/discount|cheaper|deal|coupon/i.test(lower)) return 'Customer asked about discount.';
    if(/urgent|asap|right now|same day|today/i.test(lower)) return 'Customer wants urgent or same-day help.';
    if(/water|liquid/i.test(lower)) return 'Liquid damage needs human review.';
    if(/motherboard|board repair|no power|dead phone/i.test(lower)) return 'Advanced diagnosis needs human review.';
    if(/angry|mad|upset|confused|does not make sense/i.test(lower)) return 'Message may need human review.';
    if(inventoryResult && inventoryResult.status === 'not_found') return 'Requested part was not found in inventory.';
    if(inventoryResult && inventoryResult.status === 'out_of_stock') return 'Requested part is out of stock and needs owner approval before ordering or booking.';
    if(conversation.step === 'ready_to_book') return 'Customer is ready to book.';
    if(conversation.step === 'ask_issue' && String(conversation.customer.deviceModel || '').trim().length < 4) return 'Device model is unclear.';
    return '';
  }

  function summaryFor(conversation){
    const c = conversation.customer;
    return `${c.name || 'Customer'} needs help with ${c.deviceModel || 'an unclear device'} for ${c.issue || 'an unclear repair issue'}. Inventory: ${conversation.inventoryResult.label || 'Unknown'}. Preferred time: ${c.preferredTime || 'not provided'}.`;
  }

  function queueNotifications(data, conversation, reason){
    const settings = data.chatSettings;
    const summary = summaryFor(conversation);
    const body = [
      'Fix & Chill chat handoff',
      `Customer: ${conversation.customer.name || 'Unknown'}`,
      `Phone: ${conversation.customer.phone || 'Not provided'}`,
      `Device: ${conversation.customer.deviceModel || 'Not clear'}`,
      `Issue: ${conversation.customer.issue || 'Not clear'}`,
      `Inventory: ${conversation.inventoryResult.label || 'Unknown'}`,
      `Preferred time: ${conversation.customer.preferredTime || 'Not provided'}`,
      `Reason: ${reason}`,
      `Summary: ${summary}`,
      `Admin: ${location.origin}/admin/#chat-${conversation.id}`
    ].join('\n');
    if(settings.whatsappEnabled === 'yes'){
      data.chatNotifications.push({
        id:uid(),
        chatId:conversation.id,
        type:'WhatsApp',
        destination:settings.ownerWhatsAppNumber || '',
        status:'Queued - connect WhatsApp API provider',
        body,
        createdAt:now()
      });
    }
    if(settings.emailEnabled === 'yes'){
      data.chatNotifications.push({
        id:uid(),
        chatId:conversation.id,
        type:'Email backup',
        destination:settings.notificationEmail || '',
        status:'Queued - connect email provider',
        body,
        createdAt:now()
      });
    }
  }

  function saveLead(data, conversation){
    const existing = data.chatLeads.find(lead => lead.chatId === conversation.id);
    const lead = {
      chatId:conversation.id,
      customerName:conversation.customer.name || '',
      phone:conversation.customer.phone || '',
      deviceModel:conversation.customer.deviceModel || '',
      issue:conversation.customer.issue || '',
      inventoryResult:conversation.inventoryResult.label || conversation.inventoryResult.message || '',
      preferredTime:conversation.customer.preferredTime || '',
      transcript:(conversation.messages || []).map(message => `${message.sender}: ${message.text}`).join('\n'),
      summary:summaryFor(conversation),
      status:conversation.status,
      updatedAt:now()
    };
    if(existing) Object.assign(existing, lead);
    else data.chatLeads.push(Object.assign({id:uid(), createdAt:now()}, lead));
  }

  function getConversation(data){
    let id = sessionStorage.getItem(CHAT_ID_KEY);
    let conversation = data.chatConversations.find(chat => chat.id === id);
    if(!conversation){
      conversation = {
        id:uid(),
        status:'AI Chatting',
        aiEnabled:true,
        step:'ask_name',
        customer:{name:'', phone:'', deviceModel:'', issue:'', address:'', preferredTime:''},
        inventoryResult:{status:'unknown', label:'Unknown', message:'Inventory has not been checked yet.'},
        messages:[],
        summary:'',
        handoffReason:'',
        ownerUnread:false,
        customerUnread:false,
        createdAt:now(),
        updatedAt:now()
      };
      data.chatConversations.push(conversation);
      sessionStorage.setItem(CHAT_ID_KEY, conversation.id);
    }
    return conversation;
  }

  function addMessage(conversation, sender, text){
    conversation.messages.push({sender, text, at:now()});
    conversation.updatedAt = now();
  }

  function aiReply(data, conversation, userText){
    if(conversation.status === 'Technician Joined' || conversation.aiEnabled === false){
      return 'A technician is in the conversation now. They will reply here directly.';
    }
    const c = conversation.customer;
    let reply = '';
    if(conversation.step === 'ask_name'){
      c.name = userText.trim();
      conversation.step = 'ask_phone';
      reply = `Thanks, ${c.name}. What phone number should we use for this repair request?`;
    }else if(conversation.step === 'ask_phone'){
      c.phone = userText.trim();
      conversation.step = 'ask_model';
      reply = 'Got it. What device model do you have? Example: iPhone 14 Pro Max, Samsung S25 Ultra, iPad Pro.';
    }else if(conversation.step === 'ask_model'){
      c.deviceModel = userText.trim();
      conversation.step = 'ask_issue';
      reply = 'What is the repair issue? Screen, battery, charging port, back glass, water damage, no power, motherboard, or diagnostics?';
    }else if(conversation.step === 'ask_issue'){
      c.issue = userText.trim();
      conversation.inventoryResult = inventoryCheck(data, c.deviceModel, c.issue);
      const risky = /water|liquid|no power|motherboard|board|diagnostic/i.test(c.issue);
      const priceLine = conversation.inventoryResult.price && !risky
        ? ` The listed estimate is $${conversation.inventoryResult.price}, but final price can change after inspection.`
        : ' I will not promise a final price until a technician confirms the device and part condition.';
      let scheduleLine = '';
      if(conversation.inventoryResult.status === 'in_stock'){
        scheduleLine = withinWorkingHours(data.chatSettings)
          ? ` The part appears available, so you can request a date and time between ${data.chatSettings.workStart || '10:00'} and ${data.chatSettings.workEnd || '19:00'}. The owner must approve the final appointment before it is confirmed.`
          : ' The part appears available. We are outside normal working hours, but you can still request a date and time; the owner will approve or suggest another time.';
      }else{
        scheduleLine = ` ${conversation.inventoryResult.estimatedAvailability && conversation.inventoryResult.estimatedAvailability !== 'Unknown' ? conversation.inventoryResult.estimatedAvailability : 'A technician will confirm availability.'} I am going to ask a technician before giving an appointment because the part is not confirmed in stock.`;
      }
      conversation.step = 'ask_address';
      reply = `${conversation.inventoryResult.message}${priceLine}${scheduleLine} What ZIP code or address area are you in?`;
    }else if(conversation.step === 'ask_address'){
      c.address = userText.trim();
      conversation.step = 'ask_time';
      if(conversation.inventoryResult.status === 'in_stock'){
        reply = `What date and time do you prefer? Please type something like "Monday 2 PM" or "June 30 at 11 AM". This is a request only; the owner must approve the final appointment time.`;
      }else{
        reply = 'What date and time would you prefer if the technician confirms the part is available? This is only a request; the owner must approve the part availability and appointment.';
      }
    }else if(conversation.step === 'ask_time'){
      c.preferredTime = userText.trim();
      conversation.step = 'ready_to_book';
      conversation.summary = summaryFor(conversation);
      reply = conversation.inventoryResult.status === 'in_stock'
        ? 'Thanks. I saved your requested date/time. The part appears available, but the owner still needs to approve the final appointment and price before it is confirmed.'
        : 'Thanks. I saved your requested date/time. I am sending this to a technician because the part is not confirmed in stock. The owner will confirm availability before approving an appointment.';
    }else{
      reply = 'Thanks. I added that to the conversation. A technician can review and follow up if needed.';
    }
    const reason = shouldHandoff(userText, conversation, conversation.inventoryResult);
    if(reason){
      const alreadyWaiting = conversation.status === 'Needs Human Review';
      conversation.status = 'Needs Human Review';
      conversation.handoffReason = reason;
      conversation.ownerUnread = true;
      conversation.summary = summaryFor(conversation);
      if(!alreadyWaiting) queueNotifications(data, conversation, reason);
      if(!alreadyWaiting) reply += ' I am sending this to a technician for human review.';
    }
    saveLead(data, conversation);
    return reply;
  }

  function injectStyles(){
    const style = document.createElement('style');
    style.textContent = `
      .fc-chat-bubble{position:fixed;right:18px;bottom:18px;z-index:99999;border:0;border-radius:999px;background:#1f6e6f;color:#fff;width:62px;height:62px;box-shadow:0 12px 30px rgba(15,23,42,.25);font:800 16px system-ui;cursor:pointer}
      .fc-chat-panel{position:fixed;right:18px;bottom:92px;z-index:99999;width:min(380px,calc(100vw - 28px));height:min(610px,calc(100vh - 115px));background:#fff;border:1px solid #dce4ec;border-radius:12px;box-shadow:0 18px 50px rgba(15,23,42,.25);display:none;overflow:hidden;font:15px/1.45 system-ui,Segoe UI,Arial,sans-serif;color:#0f172a}
      .fc-chat-panel.open{display:grid;grid-template-rows:auto 1fr auto}
      .fc-chat-head{background:#123f43;color:#fff;padding:14px 15px;display:flex;justify-content:space-between;gap:12px;align-items:center}
      .fc-chat-head strong{display:block}.fc-chat-head span{font-size:12px;color:#d7eef0}.fc-chat-close{border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer}
      .fc-chat-messages{padding:13px;overflow:auto;background:#f6f8fb;display:grid;gap:9px;align-content:start}
      .fc-chat-msg{max-width:86%;padding:9px 11px;border-radius:10px;background:#fff;border:1px solid #dce4ec;white-space:pre-wrap}
      .fc-chat-msg.customer{justify-self:end;background:#e8f2f3}.fc-chat-msg.owner{background:#fff7db}.fc-chat-msg.system{justify-self:center;background:#eef2ff}.fc-chat-msg.ai{background:#fff}
      .fc-chat-form{display:grid;grid-template-columns:1fr auto;gap:8px;padding:12px;border-top:1px solid #dce4ec;background:#fff}
      .fc-chat-form input{border:1px solid #dce4ec;border-radius:8px;padding:10px;font:inherit}.fc-chat-form button{border:0;border-radius:8px;background:#f2b137;color:#111;padding:0 14px;font-weight:900;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function renderMessages(panel, conversation){
    const box = panel.querySelector('.fc-chat-messages');
    box.innerHTML = conversation.messages.map(message => `<div class="fc-chat-msg ${escapeHtml(message.sender)}">${escapeHtml(message.text)}</div>`).join('');
    box.scrollTop = box.scrollHeight;
  }

  function init(){
    if(document.getElementById('fc-chat-widget')) return;
    injectStyles();
    const wrap = document.createElement('div');
    wrap.id = 'fc-chat-widget';
    wrap.innerHTML = `
      <button class="fc-chat-bubble" type="button" aria-label="Open repair chat">Chat</button>
      <section class="fc-chat-panel" aria-label="Fix and Chill repair chat">
        <div class="fc-chat-head"><div><strong>Fix & Chill Repair Assistant</strong><span>Inventory check - appointment intake - human handoff</span></div><button class="fc-chat-close" type="button" aria-label="Close chat">x</button></div>
        <div class="fc-chat-messages"></div>
        <form class="fc-chat-form"><input name="message" autocomplete="off" placeholder="Type your message"><button type="submit">Send</button></form>
      </section>`;
    document.body.appendChild(wrap);
    const panel = wrap.querySelector('.fc-chat-panel');
    const bubble = wrap.querySelector('.fc-chat-bubble');
    const close = wrap.querySelector('.fc-chat-close');
    const form = wrap.querySelector('.fc-chat-form');
    let data = loadData();
    let conversation = getConversation(data);
    if(!conversation.messages.length){
      addMessage(conversation, 'ai', 'Hi, this is Fix & Chill Phone Repair. I can check repair details and inventory, then send the request to a technician when needed. What is your full name?');
      saveData(data);
    }
    renderMessages(panel, conversation);
    bubble.addEventListener('click', () => {
      panel.classList.add('open');
      renderMessages(panel, conversation);
      form.elements.message.focus();
    });
    close.addEventListener('click', () => panel.classList.remove('open'));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const text = String(form.elements.message.value || '').trim();
      if(!text) return;
      data = loadData();
      conversation = getConversation(data);
      addMessage(conversation, 'customer', text);
      const reply = aiReply(data, conversation, text);
      addMessage(conversation, conversation.status === 'Technician Joined' ? 'system' : 'ai', reply);
      saveData(data);
      form.reset();
      renderMessages(panel, conversation);
    });
    setInterval(() => {
      data = loadData();
      const fresh = data.chatConversations.find(chat => chat.id === conversation.id);
      if(fresh && JSON.stringify(fresh.messages) !== JSON.stringify(conversation.messages)){
        conversation = fresh;
        renderMessages(panel, conversation);
      }
    }, 1500);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
