"""Upload ap.base project to NAS via SFTP, skipping venv/node_modules/build."""
import paramiko
import os
import sys

IGNORE_DIRS = {'venv', 'node_modules', 'build', '__pycache__', '.pytest_cache', '.git', 'license_keys'}
IGNORE_EXTS = {'.pyc', '.pyo', '.pem'}
IGNORE_FILES = {'.env', '.env.local', '.env.development', '.env.development.local',
                'license.key'}

LOCAL_BASE = r'D:\_Develop\ap.base'
REMOTE_BASE = '/home/porsche/ap.base'

KEY_FILE = r'C:\Users\USER\.ssh\id_ed25519'
HOST = '10.1.0.254'
USER = 'porsche'

def should_skip(name):
    return (
        name in IGNORE_DIRS
        or name in IGNORE_FILES
        or any(name.endswith(e) for e in IGNORE_EXTS)
    )

def upload_dir(sftp, local_path, remote_path, depth=0):
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        sftp.mkdir(remote_path)

    for entry in os.listdir(local_path):
        if should_skip(entry):
            continue
        local_entry = os.path.join(local_path, entry)
        remote_entry = remote_path + '/' + entry
        if os.path.isdir(local_entry):
            upload_dir(sftp, local_entry, remote_entry, depth + 1)
        else:
            print(f'  Uploading {remote_entry}')
            sftp.put(local_entry, remote_entry)

# Upload paths
UPLOAD_TARGETS = [
    (os.path.join(LOCAL_BASE, 'Develop', 'backend'), REMOTE_BASE + '/Develop/backend'),
    (os.path.join(LOCAL_BASE, 'Develop', 'frontend'), REMOTE_BASE + '/Develop/frontend'),
]
UPLOAD_FILES = [
    (os.path.join(LOCAL_BASE, 'docker-compose.nas.yml'), REMOTE_BASE + '/docker-compose.nas.yml'),
]

key = paramiko.Ed25519Key.from_private_key_file(KEY_FILE)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, pkey=key, timeout=15)
sftp = client.open_sftp()

# Ensure remote dirs exist
for _, remote_path in UPLOAD_TARGETS:
    parts = remote_path.split('/')
    for i in range(2, len(parts) + 1):
        p = '/'.join(parts[:i])
        try:
            sftp.stat(p)
        except FileNotFoundError:
            try:
                sftp.mkdir(p)
            except Exception:
                pass

print('Uploading files...')
for local_path, remote_path in UPLOAD_TARGETS:
    print(f'\n[DIR] {local_path} -> {remote_path}')
    upload_dir(sftp, local_path, remote_path)

for local_file, remote_file in UPLOAD_FILES:
    print(f'  Uploading {remote_file}')
    sftp.put(local_file, remote_file)

sftp.close()
client.close()
print('\nDone!')
