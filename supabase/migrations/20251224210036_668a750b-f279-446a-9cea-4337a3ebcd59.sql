-- Add new order status 'awaiting_driver' between 'ready' and 'out_for_delivery'
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_driver' AFTER 'ready';