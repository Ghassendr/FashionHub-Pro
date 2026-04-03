import os
import django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
django.setup()

from core.models.user import User

try:
    u = User.objects.get(email='admin@fashionhub.com')
    print(f'email: {u.email}')
    print(f'role: {u.role}')
    print(f'account_status: {u.account_status}')
    print(f'is_staff: {u.is_staff}')
    print(f'is_superuser: {u.is_superuser}')
    print(f'is_active: {u.is_active}')
    print(f'has_usable_password: {u.has_usable_password()}')
    
    # Fix if needed
    changed = False
    if not u.is_staff:
        u.is_staff = True
        changed = True
    if not u.is_superuser:
        u.is_superuser = True
        changed = True
    if u.role != 'admin':
        u.role = 'admin'
        changed = True
    if u.account_status != 'active':
        u.account_status = 'active'
        changed = True
    u.set_password('admin123')
    changed = True
    if changed:
        u.save()
        print('\n>>> FIXED: Updated admin user fields.')
    else:
        print('\n>>> All fields are correct.')
except User.DoesNotExist:
    print('Admin user not found! Creating...')
    u = User.objects.create_superuser(
        email='admin@fashionhub.com',
        username='admin',
        password='admin123'
    )
    print(f'Created admin: {u.email}, is_staff={u.is_staff}')
except Exception as e:
    print(f'ERROR: {e}')
