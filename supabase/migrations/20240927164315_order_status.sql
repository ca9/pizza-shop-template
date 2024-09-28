-- Define the ENUM type for order statuses
CREATE TYPE order_status_enum AS ENUM (
  'Order Received',
  'Order Accepted',
  'Cooking',
  'On Its Way',
  'Order Complete'
);

-- Create the order_status table linked to the public.order table
CREATE TABLE public.order_status (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id uuid NOT NULL REFERENCES public.order(id) ON DELETE CASCADE,
    status order_status_enum NOT NULL, -- ENUM for status
    status_notes text, -- additional notes about the status
    created_at timestamptz NOT NULL DEFAULT now() -- timestamp for when this status was updated
);

ALTER TABLE public.order_status
    ADD CONSTRAINT unique_order_status
        UNIQUE (order_id, status);

-- Create an index for faster queries on order_id
CREATE INDEX idx_order_status_order_id ON public.order_status(order_id);


-- Create the function that inserts the "Order Received" status for every order created
CREATE FUNCTION insert_order_received_status() RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.order_status (order_id, status)
VALUES (NEW.id, 'Order Received');
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger that calls the function after an order is inserted
CREATE TRIGGER order_status_trigger
    AFTER INSERT ON public.order
    FOR EACH ROW EXECUTE FUNCTION insert_order_received_status();


-- security policies
CREATE POLICY "Allow users to view their order statuses"
ON public.order_status
FOR SELECT
               USING (EXISTS (
               SELECT 1
               FROM public.order
               WHERE order_status.order_id = order.id
               AND order.user_id = auth.uid()
               ));

CREATE POLICY "Allow admins to view all order statuses"
ON public.order_status
FOR SELECT
               USING (auth.role() = 'admin');
