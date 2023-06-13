#!/bin/sh

# Wait for the database to become available
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -p "$POSTGRES_PORT" -d "$POSTGRES_DB" -c '\q'; do
    echo "Waiting for PostgreSQL to become available..."
    sleep 1
done

echo "PostgreSQL is available, continuing..."

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start the application
python manage.py runserver "$DJANGO_HOST":"$DJANGO_PORT"
