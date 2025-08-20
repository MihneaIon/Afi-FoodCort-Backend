-- Rulează toate procedurile și trigger-urile
\i procedures/category_procedures.sql
\i procedures/audit_triggers.sql
\i procedures/validation_triggers.sql

-- Inserează categorii inițiale folosind procedura
SELECT insert_category('Italian', 'Authentic Italian cuisine', '🍝');
SELECT insert_category('Asian', 'Asian fusion and traditional dishes', '🍜');
SELECT insert_category('Mexican', 'Spicy and flavorful Mexican food', '🌮');
SELECT insert_category('American', 'Classic American comfort food', '🍔');
SELECT insert_category('Mediterranean', 'Fresh Mediterranean cuisine', '🥗');
SELECT insert_category('Fast Food', 'Quick and convenient meals', '🍟');

-- Verifică sugestiile automate
SELECT * FROM auto_detect_categories();

-- Verifică statisticile
SELECT * FROM get_category_stats();
