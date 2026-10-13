INSERT INTO kitchen_display_device (merchant_id, station_id, name, device_identifier, ip_address, is_online, last_sync, status, created_at, updated_at)
VALUES 
  (2, 9, 'Desserts & Bakery Touch Terminal #4', 'kds-terminal-dessert-9', '192.168.1.109', true, NOW(), 'active', NOW(), NOW()),
  (1, 4, 'Desserts & Bakery Touch Terminal #4', 'kds-terminal-dessert-4', '192.168.1.104', true, NOW(), 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;
