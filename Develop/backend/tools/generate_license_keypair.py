"""
產生 License 簽發用的 Ed25519 Keypair

用法（商用版發布前執行一次即可，結果保存在 HSM 或離線備份）：
    cd Develop/backend
    venv/Scripts/python tools/generate_license_keypair.py

產出：
    private_key.pem  ← 商用版團隊保存，用於簽發 license.key（絕對不可外流）
    public_key.pem   ← 嵌入 CE 的 app/core/license.py 的 LICENSE_PUBLIC_KEY_HEX 常數

執行後：
    1. 將 public_key.hex 內容複製到 app/core/license.py 的 LICENSE_PUBLIC_KEY_HEX
    2. private_key.pem 保存在安全位置（離線環境 / HSM），僅用於簽發 license
    3. 已簽發給客戶的 license.key 會對應這把公鑰，之後若重產 keypair，所有既有 license 會失效
"""

import sys
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives import serialization

sys.stdout.reconfigure(encoding='utf-8')


def main():
    # 產生 Ed25519 keypair
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    # 序列化
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()  # 生產環境可加密碼
    )

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    public_raw = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )

    # 存檔
    out_dir = Path('./license_keys')
    out_dir.mkdir(exist_ok=True)

    (out_dir / 'private_key.pem').write_bytes(private_pem)
    (out_dir / 'public_key.pem').write_bytes(public_pem)
    (out_dir / 'public_key.hex').write_text(public_raw.hex(), encoding='utf-8')

    print('=' * 60)
    print('License keypair generated')
    print('=' * 60)
    print(f'  Private key: {out_dir / "private_key.pem"}  (KEEP SECRET)')
    print(f'  Public key:  {out_dir / "public_key.pem"}')
    print(f'  Public hex:  {out_dir / "public_key.hex"}')
    print()
    print(f'Public key (hex, {len(public_raw)} bytes):')
    print(f'  {public_raw.hex()}')
    print()
    print('=' * 60)
    print('Next step')
    print('=' * 60)
    print('1. Copy the hex string above')
    print('2. Open app/core/license.py and replace LICENSE_PUBLIC_KEY_HEX value')
    print('3. Store private_key.pem safely (HSM / offline backup)')
    print('4. DELETE license_keys/private_key.pem from this machine after backup')


if __name__ == '__main__':
    main()
