from ..config import settings
import json


def _web3_available():
    try:
        import web3  # type: ignore
        return True
    except Exception:
        return False


def _contract_available():
    return bool(settings.CONTRACT_ADDRESS and settings.CONTRACT_ABI_JSON)


def log_report_hash(data: dict) -> str:
    """Logs a hash-like payload to chain via a dummy self-transfer.

    If WEB3 credentials are not configured or web3 is missing, returns a stub tx hash.
    """
    # Try to construct a message/hash
    import hashlib
    payload = json.dumps(data, sort_keys=True, default=str).encode()
    msg_hash = '0x' + hashlib.sha256(payload).hexdigest()

    if not _web3_available() or not settings.WEB3_RPC_URL or not settings.WEB3_PRIVATE_KEY or not settings.WEB3_FROM_ADDRESS:
        return msg_hash  # fallback deterministic hash

    # On-chain: send 0-value tx with data field carrying the hash (if EVM supports)
    from web3 import Web3  # type: ignore
    w3 = Web3(Web3.HTTPProvider(settings.WEB3_RPC_URL))
    acct = w3.eth.account.from_key(settings.WEB3_PRIVATE_KEY)
    from_addr = Web3.to_checksum_address(settings.WEB3_FROM_ADDRESS)
    chain_id = settings.WEB3_CHAIN_ID or w3.eth.chain_id
    if _contract_available():
        try:
            abi = json.loads(settings.CONTRACT_ABI_JSON)
            contract = w3.eth.contract(address=Web3.to_checksum_address(settings.CONTRACT_ADDRESS), abi=abi)
            fn = contract.functions.logHash(msg_hash)
            tx = fn.build_transaction({
                'from': from_addr,
                'nonce': w3.eth.get_transaction_count(from_addr),
                'gasPrice': w3.eth.gas_price,
                'chainId': chain_id
            })
            signed = acct.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
            return w3.to_hex(tx_hash)
        except Exception:
            pass
    # fallback to self-transfer with data
    nonce = w3.eth.get_transaction_count(from_addr)
    tx = {
        'to': from_addr,
        'value': 0,
        'gas': 210000,
        'gasPrice': w3.eth.gas_price,
        'nonce': nonce,
        'chainId': chain_id,
        'data': msg_hash
    }
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return w3.to_hex(tx_hash)


def verify_hash(tx_hash: str) -> bool:
    if not _web3_available() or not settings.WEB3_RPC_URL:
        return True  # assume valid in fallback mode
    from web3 import Web3  # type: ignore
    w3 = Web3(Web3.HTTPProvider(settings.WEB3_RPC_URL))
    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        return receipt and receipt.get('status', 0) == 1
    except Exception:
        return False
