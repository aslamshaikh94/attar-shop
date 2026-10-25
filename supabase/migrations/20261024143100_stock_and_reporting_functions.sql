-- Atomic functions for stock management
-- Stock management and reporting functions.

alter table sales
  add column if not exists payment_method text not null default 'Cash',
  add column if not exists note text,
  add column if not exists cost_price numeric;

alter table purchases
  add column if not exists note text;

update sales s
set cost_price = p.buying_price
from products p
where s.product_id = p.id
  and s.cost_price is null;

alter table sales alter column cost_price set default 0;

create or replace function record_purchase(
  p_product_id bigint,
  p_qty numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_supplier text,
  p_date date
) returns bigint as $$
declare
  v_id bigint;
begin
  insert into purchases (product_id, qty, unit_price, total_price, supplier, date)
  values (p_product_id, p_qty, p_unit_price, p_total_price, p_supplier, p_date)
  returning id into v_id;

  update products set stock_qty = stock_qty + p_qty where id = p_product_id;

  return v_id;
end;
$$ language plpgsql;

create or replace function record_purchase_with_details(
  p_product_id bigint,
  p_qty numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_supplier text,
  p_date date,
  p_note text,
  p_update_buying_price boolean
) returns bigint as $$
declare
  v_id bigint;
begin
  if p_qty <= 0 or p_unit_price < 0 then
    raise exception 'Quantity must be positive and cost cannot be negative';
  end if;

  perform 1 from products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  insert into purchases (product_id, qty, unit_price, total_price, supplier, date, note)
  values (p_product_id, p_qty, p_unit_price, p_total_price, p_supplier, p_date, p_note)
  returning id into v_id;

  update products
  set stock_qty = stock_qty + p_qty,
      buying_price = case when p_update_buying_price then p_unit_price else buying_price end
  where id = p_product_id;

  return v_id;
end;
$$ language plpgsql;

create or replace function delete_recorded_purchase(p_purchase_id bigint) returns void as $$
declare
  v_product_id bigint;
  v_qty numeric;
  v_stock numeric;
begin
  select product_id, qty into v_product_id, v_qty
  from purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'Purchase not found';
  end if;

  select stock_qty into v_stock
  from products
  where id = v_product_id
  for update;

  if v_stock is null then
    raise exception 'Product not found';
  end if;

  if v_stock < v_qty then
    raise exception 'Cannot delete this purchase because some of its stock has already been sold';
  end if;

  update products set stock_qty = stock_qty - v_qty where id = v_product_id;
  delete from purchases where id = p_purchase_id;
end;
$$ language plpgsql;

create or replace function record_sale(
  p_product_id bigint,
  p_qty numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_customer text,
  p_date date
) returns bigint as $$
declare
  v_id bigint;
  v_stock numeric;
  v_cost numeric;
begin
  select stock_qty, buying_price into v_stock, v_cost
  from products where id = p_product_id for update;

  if v_stock is null then
    raise exception 'Product not found';
  end if;
  if v_stock < p_qty then
    raise exception 'Insufficient stock';
  end if;

  insert into sales (product_id, qty, unit_price, total_price, cost_price, customer, date)
  values (p_product_id, p_qty, p_unit_price, p_total_price, v_cost, p_customer, p_date)
  returning id into v_id;

  update products set stock_qty = stock_qty - p_qty where id = p_product_id;

  return v_id;
end;
$$ language plpgsql;

create or replace function record_sale_with_details(
  p_product_id bigint,
  p_qty numeric,
  p_unit_price numeric,
  p_total_price numeric,
  p_customer text,
  p_date date,
  p_payment_method text,
  p_note text
) returns bigint as $$
declare
  v_id bigint;
  v_stock numeric;
  v_cost numeric;
begin
  if p_qty <= 0 or p_unit_price < 0 then
    raise exception 'Quantity must be positive and price cannot be negative';
  end if;

  select stock_qty, buying_price into v_stock, v_cost
  from products
  where id = p_product_id
  for update;

  if v_stock is null then
    raise exception 'Product not found';
  end if;

  if v_stock < p_qty then
    raise exception 'Insufficient stock';
  end if;

  insert into sales (product_id, qty, unit_price, total_price, cost_price, customer, date, payment_method, note)
  values (p_product_id, p_qty, p_unit_price, p_total_price, v_cost, p_customer, p_date, p_payment_method, p_note)
  returning id into v_id;

  update products set stock_qty = stock_qty - p_qty where id = p_product_id;

  return v_id;
end;
$$ language plpgsql;

create or replace function delete_recorded_sale(p_sale_id bigint) returns void as $$
declare
  v_product_id bigint;
  v_qty numeric;
begin
  select product_id, qty into v_product_id, v_qty
  from sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  update products set stock_qty = stock_qty + v_qty where id = v_product_id;
  delete from sales where id = p_sale_id;
end;
$$ language plpgsql;

-- Report summary function
create or replace function report_summary(
  p_from date,
  p_to date
) returns table (
  total_sales numeric,
  total_purchases numeric,
  total_expenses numeric,
  gross_profit numeric,
  net_profit numeric
) language plpgsql as $$
begin
  return query
  select
    coalesce((select sum(total_price) from sales where date between p_from and p_to), 0),
    coalesce((select sum(total_price) from purchases where date between p_from and p_to), 0),
    coalesce((select sum(amount) from expenses where date between p_from and p_to), 0),
    coalesce((select sum(total_price - (cost_price * qty)) from sales where date between p_from and p_to), 0),
    coalesce((select sum(total_price - (cost_price * qty)) from sales where date between p_from and p_to), 0) -
    coalesce((select sum(amount) from expenses where date between p_from and p_to), 0);
end;
$$;

-- Product movement function
create or replace function product_movement() returns table (
  id bigint,
  name text,
  type text,
  stock_qty numeric,
  unit text,
  bought numeric,
  sold numeric,
  revenue numeric,
  cost numeric
) language plpgsql as $$
begin
  return query
  select
    p.id, p.name, p.type, p.stock_qty, p.unit,
    coalesce(pu.bought, 0), coalesce(s.sold, 0),
    coalesce(s.revenue, 0), coalesce(pu.cost, 0)
  from products p
  left join (
    select product_id, sum(qty) as bought, sum(total_price) as cost
    from purchases group by product_id
  ) pu on pu.product_id = p.id
  left join (
    select product_id, sum(qty) as sold, sum(total_price) as revenue
    from sales group by product_id
  ) s on s.product_id = p.id
  order by p.name;
end;
$$;
