-- Clean all Kitchen Orders, Items, and Event Logs, restarting IDs to 1
TRUNCATE TABLE kitchen_event_log, kitchen_order_item, kitchen_order RESTART IDENTITY CASCADE;
