-- Run this to see what columns are actually available in the buckets table
select column_name, data_type 
from information_schema.columns 
where table_schema = 'storage' 
  and table_name = 'buckets';
