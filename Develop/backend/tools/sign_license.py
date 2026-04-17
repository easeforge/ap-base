"""
簽發 license.key 工具（商用版團隊使用）

用法：
    venv/Scripts/python tools/sign_license.py \
        --private-key ./license_keys/private_key.pem \
        --customer-id cust-001 \
        --customer-name "Example Corp" \
        --features scheduler ai sso \
        --expires-days 365 \
        --max-users 100 \
        --output license.key

產出：
    license.key  ← 交付給客戶，客戶放在 backend/license.key 即可啟用 EE 功能
"""

import sys
import json
import base64
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

sys.stdout.reconfigure(encoding='utf-8')


def main():
    parser = argparse.ArgumentParser(description='簽發 License Key')
    parser.add_argument('--private-key', required=True, help='私鑰 PEM 檔路徑')
    parser.add_argument('--customer-id', required=True, help='客戶識別碼')
    parser.add_argument('--customer-name', required=True, help='客戶名稱')
    parser.add_argument('--features', nargs='+', required=True,
                        help='授權功能清單（如：scheduler ai sso audit_report）')
    parser.add_argument('--expires-days', type=int, default=365, help='有效天數（預設 365）')
    parser.add_argument('--max-users', type=int, default=None, help='最大使用者數（0 或省略為不限制）')
    parser.add_argument('--max-orgs', type=int, default=None, help='最大組織數')
    parser.add_argument('--output', default='license.key', help='輸出檔案路徑')
    args = parser.parse_args()

    # 載入私鑰
    private_key_path = Path(args.private_key)
    if not private_key_path.exists():
        print(f'ERROR: private key not found: {private_key_path}')
        sys.exit(1)

    with open(private_key_path, 'rb') as f:
        private_key = serialization.load_pem_private_key(f.read(), password=None)

    if not isinstance(private_key, Ed25519PrivateKey):
        print('ERROR: private key is not Ed25519')
        sys.exit(1)

    # 組 payload
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(days=args.expires_days)

    payload = {
        'customer_id': args.customer_id,
        'customer_name': args.customer_name,
        'features': sorted(set(args.features)),
        'issued_at': issued_at.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
        'expires_at': expires_at.strftime('%Y-%m-%dT%H:%M:%S+00:00'),
    }
    if args.max_users:
        payload['max_users'] = args.max_users
    if args.max_orgs:
        payload['max_organizations'] = args.max_orgs

    # 簽章（canonical JSON）
    payload_bytes = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
    signature = private_key.sign(payload_bytes)
    signature_b64 = base64.urlsafe_b64encode(signature).decode('ascii')

    # 輸出 license
    license_doc = {
        'header': {'alg': 'ed25519', 'typ': 'base-ap-license', 'ver': 1},
        'payload': payload,
        'signature': signature_b64
    }

    output_path = Path(args.output)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(license_doc, f, indent=2, ensure_ascii=False)

    print('=' * 60)
    print('License signed successfully')
    print('=' * 60)
    print(f'  Output:        {output_path.absolute()}')
    print(f'  Customer:      {args.customer_name} ({args.customer_id})')
    print(f'  Features:      {payload["features"]}')
    print(f'  Issued at:     {payload["issued_at"]}')
    print(f'  Expires at:    {payload["expires_at"]} ({args.expires_days} days)')
    if args.max_users:
        print(f'  Max users:     {args.max_users}')
    if args.max_orgs:
        print(f'  Max orgs:      {args.max_orgs}')
    print()
    print('Deliver this file to the customer. They should place it at:')
    print('  Develop/backend/license.key')
    print('Then restart the backend to activate Enterprise Edition.')


if __name__ == '__main__':
    main()
