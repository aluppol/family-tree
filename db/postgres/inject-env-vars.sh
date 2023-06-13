#!/bin/bash

# Define array of variable names
env_vars=("POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD")

cp docker-entrypoint-initdb.d/init_template.sql docker-entrypoint-initdb.d/init_temp.sql
# Loop through each variable name and replace in init.sql
for var in "${env_vars[@]}"
do
    sed -i "s/\$$var/${!var}/g" docker-entrypoint-initdb.d/init_temp.sql
done

# Create a temporary file and move the processed init.sql to it
mv docker-entrypoint-initdb.d/init_temp.sql docker-entrypoint-initdb.d/init.sql
rm -f docker-entrypoint-initdb.d/init_temp.sql