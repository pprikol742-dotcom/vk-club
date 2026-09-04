-- Только читает, ничего не меняет.
-- Прогони в SQL Editor и пришли мне вывод целиком.

select 'ТАБЛИЦЫ' as блок, table_name as имя, '' as детали
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'

union all
select 'КОЛОНКИ clubs', column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'clubs'

union all
select 'ФУНКЦИИ', routine_name, ''
from information_schema.routines
where routine_schema = 'public'

order by 1, 2;
