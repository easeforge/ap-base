"""
Upload project to remote host via SFTP, skipping venv/node_modules/build.

設定（環境變數 or 預設值）：
    DEPLOY_LOCAL_BASE   本機專案目錄         (預設：當前目錄)
    DEPLOY_REMOTE_BASE  遠端目錄             (預設：/home/<user>/ap.base)
    DEPLOY_HOST         遠端 host            (預設：localhost)
    DEPLOY_USER         SSH 使用者           (預設：當前使用者)
    DEPLOY_KEY_FILE     SSH 金鑰路徑         (預設：~/.ssh/id_ed25519)

例：
    set DEPLOY_HOST=server.example.com
    set DEPLOY_USER=deploy
    set DEPLOY_REMOTE_BASE=/srv/myapp
    python deploy_to_nas.py
"""
import paramiko
import os
import sys

IGNORE_DIRS = {'venv', 'node_modules', 'build', '__pycache__', '.pytest_cache', '.git', 'license_keys'}
IGNORE_EXTS = {'.pyc', '.pyo', '.pem'}
IGNORE_FILES = {'.env', '.env.local', '.env.development', '.env.development.local',
                'license.key'}

LOCAL_BASE = os.environ.get('DEPLOY_LOCAL_BASE', os.getcwd())
USER = os.environ.get('DEPLOY_USER', os.environ.get('USER') or os.environ.get('USERNAME') or 'deploy')
REMOTE_BASE = os.environ.get('DEPLOY_REMOTE_BASE', f'/home/{USER}/ap.base')
HOST = os.environ.get('DEPLOY_HOST', 'localhost')
KEY_FILE = os.environ.get('DEPLOY_KEY_FILE', os.path.expanduser('~/.ssh/id_ed25519'))

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

print(f'Deploying to {USER}@{HOST}:{REMOTE_BASE}')
print(f'  Local:    {LOCAL_BASE}')
print(f'  Key file: {KEY_FILE}')
print()

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
