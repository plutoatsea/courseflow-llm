# This script prepares the database, adds the admin, and runs the server
#!/bin/bash
set -e

# Run database migrations
echo "Running migrations..."
python course_flow.py migrate

# Seed initial data
echo "Seeding Saltise strategies..."
python course_flow.py create_saltise_strategies

echo "Seeding base disciplines..."
python course_flow.py create_base_disciplines

# Create superuser if it doesn't exist and set up Teacher group
echo "Ensuring superuser exists and setting up Teacher group..."
python course_flow.py shell -c "
from django.contrib.auth.models import User, Group;
username = '${DJANGO_SUPERUSER_USERNAME:-admin}';
email = '${DJANGO_SUPERUSER_EMAIL:-admin@example.com}';
password = '${DJANGO_SUPERUSER_PASSWORD:-admin123}';
if not User.objects.filter(username=username).exists():
    user = User.objects.create_superuser(username, email, password)
else:
    user = User.objects.get(username=username)

# Create Teacher group if it doesn't exist
teacher_group, created = Group.objects.get_or_create(name='Teacher')
# Add user to Teacher group
user.groups.add(teacher_group)
"