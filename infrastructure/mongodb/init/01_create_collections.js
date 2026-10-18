// MongoDB Init Script
// Her servis için ayrı koleksiyonlar oluşturur

// Property Service DB
db = db.getSiblingDB('property_service_db');

db.createCollection('properties');
db.properties.createIndex({ landlordId: 1 });
db.properties.createIndex({ status: 1 });
db.properties.createIndex({ 'location.city': 1, 'location.district': 1 });
db.properties.createIndex({ 'location.coordinates': '2dsphere' });
db.properties.createIndex({ monthlyRent: 1 });
db.properties.createIndex({ propertyType: 1 });
print('Property Service DB initialized.');

// Maintenance Service DB
db = db.getSiblingDB('maintenance_service_db');

db.createCollection('maintenance_requests');
db.maintenance_requests.createIndex({ propertyId: 1, status: 1 });
db.maintenance_requests.createIndex({ tenantId: 1 });
db.maintenance_requests.createIndex({ priority: 1, status: 1 });
db.maintenance_requests.createIndex({ createdAt: 1 });
print('Maintenance Service DB initialized.');

// Notification Service DB
db = db.getSiblingDB('notification_service_db');

db.createCollection('notifications');
db.createCollection('notification_templates');

// TTL index: 90 günden eski okunmuş bildirimler otomatik silinir
db.notifications.createIndex({ sentAt: 1 }, { expireAfterSeconds: 7776000 });
db.notifications.createIndex({ recipientId: 1, status: 1 });

// Notification şablonları
db.notification_templates.insertMany([
  {
    templateId: 'RENT_PAYMENT_SUCCESS',
    emailSubject: '✅ Kira Ödemeniz Alındı',
    emailBody: 'Sayın {{tenantName}}, {{month}} ayı kira ödemeniz ({{amount}} ₺) başarıyla alınmıştır. Makbuzunuz ektedir.',
    smsBody: 'Kira ödemeniz alındı: {{amount}} TL',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'RENT_PAYMENT_FAILED',
    emailSubject: '❌ Kira Ödemeniz Başarısız',
    emailBody: 'Sayın {{tenantName}}, {{month}} ayı kira ödemeniz işlenemedi. Lütfen tekrar deneyiniz. Hata: {{failureReason}}',
    smsBody: 'Kira ödemeniz başarısız. Lütfen tekrar deneyin.',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'RENT_REMINDER',
    emailSubject: '⏰ Kira Ödeme Hatırlatması',
    emailBody: 'Sayın {{tenantName}}, {{dueDate}} tarihinde {{amount}} ₺ kira ödemeniz bulunmaktadır.',
    smsBody: 'Hatırlatma: {{dueDate}} tarihinde {{amount}} TL kira ödemeniz var.',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'LEASE_CREATED',
    emailSubject: '🏠 Hoş Geldiniz — Kira Sözleşmeniz Hazır',
    emailBody: 'Sayın {{tenantName}}, {{propertyAddress}} adresindeki konut için kira sözleşmeniz oluşturulmuştur. Sözleşme başlangıç tarihi: {{startDate}}. Aylık kira: {{monthlyRent}} ₺.',
    smsBody: 'Kira sözleşmeniz oluşturuldu. Başlangıç: {{startDate}}',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'LEASE_EXPIRING',
    emailSubject: '⚠️ Kira Sözleşmeniz Yakında Bitiyor',
    emailBody: 'Sayın {{tenantName}}, kira sözleşmeniz {{endDate}} tarihinde sona erecektir. Yenileme için lütfen ev sahibinizle iletişime geçin.',
    smsBody: 'Kira sözleşmeniz {{endDate}} tarihinde bitiyor.',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'DEPOSIT_REFUNDED',
    emailSubject: '💰 Depozitosunuz İade Edildi',
    emailBody: 'Sayın {{tenantName}}, {{depositAmount}} ₺ depozitosunuzun {{refundAmount}} ₺ tutarındaki iadesi işleme alınmıştır.',
    smsBody: 'Depozitonuz iade edildi: {{refundAmount}} TL',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'MAINTENANCE_UPDATE',
    emailSubject: '🔧 Bakım Talebi Güncellendi',
    emailBody: 'Sayın {{tenantName}}, bakım talebiniz güncellendi. Durum: {{status}}. Notlar: {{notes}}',
    smsBody: 'Bakım talebiniz güncellendi: {{status}}',
    isActive: true,
    createdAt: new Date()
  },
  {
    templateId: 'LEASE_TERMINATED',
    emailSubject: '📋 Kira Sözleşmesi Sonlandırıldı',
    emailBody: 'Sayın {{tenantName}}, {{terminationDate}} tarihi itibarıyla kira sözleşmeniz sonlandırılmıştır. Hasar değerlendirmesi: {{damageAssessment}}',
    smsBody: 'Kira sözleşmeniz {{terminationDate}} tarihinde sonlandırıldı.',
    isActive: true,
    createdAt: new Date()
  }
]);
print('Notification Service DB initialized with templates.');

// Document Service DB
db = db.getSiblingDB('document_service_db');

db.createCollection('documents');
db.documents.createIndex({ leaseId: 1, type: 1 });
db.documents.createIndex({ tenantId: 1 });
db.documents.createIndex({ createdAt: -1 });
print('Document Service DB initialized.');

print('All MongoDB databases initialized successfully!');
